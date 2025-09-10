import { ErrorType, type ErrorAnalysisResult } from '../types/errors';

/**
 * Анализирует ошибку от Vertex AI и определяет её тип
 */
export function analyzeVertexAIError(error: any, requestCount?: number): ErrorAnalysisResult {
  const status = error?.status ?? error?.response?.status ?? 500;
  const originalMessage = error?.responseJson?.error?.message || error?.message || 'Unknown error';
  const errorCode = error?.responseJson?.error?.code;
  const errorType = error?.responseJson?.error?.type;
  
  // Приводим сообщение к нижнему регистру для анализа
  const msgLower = String(originalMessage).toLowerCase();
  
  // 1. Ошибки цензуры/модерации контента
  if (isCensorshipError(status, msgLower, errorCode, errorType)) {
    return {
      errorType: ErrorType.CONTENT_CENSORSHIP,
      userMessage: '🚫 Контент не прошёл модерацию Vertex AI. Попробуйте изменить промпт.',
      suggestions: [
        'Измените формулировку промпта',
        'Уберите потенциально нежелательные слова',
        'Попробуйте более нейтральное описание'
      ],
      retryable: false,
      originalStatus: status,
      originalMessage
    };
  }
  
  // 2. Ошибки аутентификации и API доступа
  if (status === 401 || status === 403) {
    // Специальная обработка для CONSUMER_INVALID - это означает что API не включен
    if (msgLower.includes('consumer_invalid') || msgLower.includes('permission denied')) {
      return {
        errorType: ErrorType.AUTH_ERROR,
        userMessage: '🔑 Vertex AI API не включен в вашем Google Cloud проекте.',
        suggestions: [
          'Перейдите в Google Cloud Console → APIs & Services → Library',
          'Найдите "Vertex AI API" и нажмите "Enable"',
          'Подождите 2-3 минуты после включения API',
          'Убедитесь, что у проекта включен биллинг'
        ],
        retryable: false,
        originalStatus: status,
        originalMessage
      };
    }
    
    return {
      errorType: ErrorType.AUTH_ERROR,
      userMessage: '🔑 Проблема с аутентификацией Vertex AI.',
      suggestions: [
        'Проверьте файл с ключами сервисного аккаунта',
        'Убедитесь, что у сервисного аккаунта есть роль "Vertex AI User"',
        'Проверьте настройки проекта в Google Cloud'
      ],
      retryable: false,
      originalStatus: status,
      originalMessage
    };
  }
  
  // 3. Недостаточно кредитов или квот
  if (status === 402 || msgLower.includes('insufficient') || msgLower.includes('credits') || msgLower.includes('quota')) {
    return {
      errorType: ErrorType.INSUFFICIENT_CREDITS,
      userMessage: '💳 Превышена квота или недостаточно кредитов в Google Cloud.',
      suggestions: [
        'Проверьте биллинг в Google Cloud Console',
        'Убедитесь, что не превышены квоты Vertex AI',
        'Проверьте лимиты использования'
      ],
      retryable: false,
      originalStatus: status,
      originalMessage
    };
  }
  
  // 4. Rate limiting
  if (status === 429 || msgLower.includes('rate limit') || msgLower.includes('too many requests')) {
    return {
      errorType: ErrorType.RATE_LIMIT,
      userMessage: '⏰ Превышен лимит запросов. Попробуйте чуть позже.',
      suggestions: [
        'Подождите несколько минут',
        'Уменьшите количество одновременных запросов',
        requestCount && requestCount > 2 ? `Попробуйте уменьшить количество до ${Math.max(1, Math.floor(requestCount/2))}` : null
      ].filter(Boolean) as string[],
      retryable: true,
      originalStatus: status,
      originalMessage
    };
  }
  
  // 5. Перегрузка серверов
  if (isServerOverloadError(status, msgLower)) {
    return {
      errorType: ErrorType.SERVER_OVERLOAD,
      userMessage: '🖥️ Серверы Vertex AI перегружены. Попробуйте позже.',
      suggestions: [
        'Подождите 5-10 минут',
        'Попробуйте другой регион (us-east1, europe-west1)',
        requestCount && requestCount > 1 ? 'Уменьшите количество изображений' : null
      ].filter(Boolean) as string[],
      retryable: true,
      originalStatus: status,
      originalMessage
    };
  }
  
  // 6. Геограничения
  if (msgLower.includes('country') && msgLower.includes('not supported') || 
      msgLower.includes('location') && msgLower.includes('not supported') ||
      msgLower.includes('region') && msgLower.includes('not supported')) {
    return {
      errorType: ErrorType.GEO_RESTRICTION,
      userMessage: '🌍 Гео-ограничение. Сервис недоступен в вашем регионе.',
      suggestions: [
        'Используйте VPN (США или Европа)',
        'Попробуйте другую модель',
        'Обратитесь к администратору'
      ],
      retryable: false,
      originalStatus: status,
      originalMessage
    };
  }
  
  // 7. Таймауты
  if (status === 408 || msgLower.includes('timeout') || msgLower.includes('time out')) {
    return {
      errorType: ErrorType.TIMEOUT,
      userMessage: '⏱️ Превышено время ожидания ответа.',
      suggestions: [
        'Попробуйте ещё раз',
        requestCount && requestCount > 2 ? `Уменьшите количество до ${Math.max(1, Math.floor(requestCount/2))}` : null,
        'Проверьте интернет-соединение'
      ].filter(Boolean) as string[],
      retryable: true,
      originalStatus: status,
      originalMessage
    };
  }
  
  // 8. Системные ошибки
  if (status >= 500 && status < 600) {
    return {
      errorType: ErrorType.SYSTEM_ERROR,
      userMessage: '⚠️ Системная ошибка на стороне Vertex AI.',
      suggestions: [
        'Попробуйте через несколько минут',
        'Проверьте статус Google Cloud',
        'Попробуйте другой регион'
      ],
      retryable: true,
      originalStatus: status,
      originalMessage
    };
  }
  
  // Неизвестная ошибка
  return {
    errorType: ErrorType.UNKNOWN_ERROR,
    userMessage: `❓ Неизвестная ошибка Vertex AI: ${originalMessage}`,
    suggestions: [
      'Попробуйте ещё раз',
      'Проверьте промпт на корректность',
      'Обратитесь к поддержке Google Cloud'
    ],
    retryable: true,
    originalStatus: status,
    originalMessage
  };
}

/**
 * Совместимость: алиас для analyzeVertexAIError
 */
export function analyzeOpenRouterError(error: any, requestCount?: number): ErrorAnalysisResult {
  return analyzeVertexAIError(error, requestCount);
}

/**
 * Определяет, является ли ошибка связанной с цензурой/модерацией контента
 */
function isCensorshipError(status: number, message: string, errorCode?: string, errorType?: string): boolean {
  // HTTP статусы, часто используемые для цензуры
  if (status === 422 || status === 400) {
    // Ключевые слова, указывающие на цензуру
    const censorshipKeywords = [
      'content policy',
      'policy violation',
      'unsafe content',
      'inappropriate content',
      'content filter',
      'content blocked',
      'content rejected',
      'moderation',
      'safety filter',
      'content safety',
      'violates our',
      'against our policy',
      'content guidelines',
      'safety guidelines',
      'harmful content',
      'inappropriate request',
      'content not allowed',
      'prohibited content',
      'content violation',
      'safety violation'
    ];
    
    if (censorshipKeywords.some(keyword => message.includes(keyword))) {
      return true;
    }
  }
  
  // Проверяем коды ошибок
  if (errorCode && typeof errorCode === 'string') {
    const censorshipCodes = [
      'content_policy_violation',
      'safety_violation',
      'content_filtered',
      'inappropriate_content'
    ];
    if (censorshipCodes.includes(errorCode.toLowerCase())) {
      return true;
    }
  }
  
  // Проверяем типы ошибок
  if (errorType && typeof errorType === 'string') {
    const censorshipTypes = [
      'content_policy_violation',
      'safety_filter',
      'content_filter'
    ];
    if (censorshipTypes.includes(errorType.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

/**
 * Определяет, является ли ошибка связанной с перегрузкой серверов
 */
function isServerOverloadError(status: number, message: string): boolean {
  if (status === 502 || status === 503 || status === 504) {
    return true;
  }
  
  const overloadKeywords = [
    'server overload',
    'too many concurrent',
    'service unavailable',
    'capacity exceeded',
    'temporarily unavailable',
    'server busy',
    'high demand',
    'resource limit',
    'queue full',
    'processing limit'
  ];
  
  return overloadKeywords.some(keyword => message.includes(keyword));
}
