/**
 * Multi-language translations for Twiga chatbot
 * Supports: English (en), Spanish (es), French (fr), Portuguese (pt), Arabic (ar), Chinese (zh)
 */

type LanguageCode = "en" | "es" | "fr" | "pt" | "ar" | "zh";

interface Translations {
  [key: string]: {
    [lang in LanguageCode]: string;
  };
}

const translations: Translations = {
  greeting: {
    en: "Niaje! 👋 Naitwa Twiga 🦒, your friendly travel assistant at NoLSAF! Just like the giraffe (twiga) gracefully reaches for the highest leaves, I'm here to help you find the perfect accommodation! 🎯 NoLSAF is your trusted platform for verified property bookings 🏨, integrated transport services 🚗, and seamless local & international payments 💳. I can help with accommodation bookings, Group Stay options, Plan with Us custom trips, cancellations, and all your travel needs. How can I assist you today? 😊",
    es: "¡Hola! 👋 Soy Twiga 🦒, tu asistente de viajes amigable en NoLSAF! Así como la jirafa (twiga) alcanza con gracia las hojas más altas, ¡estoy aquí para ayudarte a encontrar el alojamiento perfecto! 🎯 NoLSAF es tu plataforma confiable para reservas de propiedades verificadas 🏨, servicios de transporte integrados 🚗 y pagos locales e internacionales sin problemas 💳. Puedo ayudar con reservas de alojamiento, opciones de Estancia Grupal, Planes Personalizados, cancelaciones y todas tus necesidades de viaje. ¿Cómo puedo ayudarte hoy? 😊",
    fr: "Bonjour! 👋 Je suis Twiga 🦒, votre assistant de voyage amical à NoLSAF! Tout comme la girafe (twiga) atteint gracieusement les feuilles les plus hautes, je suis là pour vous aider à trouver l'hébergement parfait! 🎯 NoLSAF est votre plateforme de confiance pour les réservations de propriétés vérifiées 🏨, les services de transport intégrés 🚗 et les paiements locaux et internationaux sans problème 💳. Je peux aider avec les réservations d'hébergement, les options de Séjour de Groupe, les voyages personnalisés Plan avec Nous, les annulations et tous vos besoins de voyage. Comment puis-je vous aider aujourd'hui? 😊",
    pt: "Olá! 👋 Sou Twiga 🦒, seu assistente de viagem amigável na NoLSAF! Assim como a girafa (twiga) alcança graciosamente as folhas mais altas, estou aqui para ajudá-lo a encontrar a acomodação perfeita! 🎯 NoLSAF é sua plataforma confiável para reservas de propriedades verificadas 🏨, serviços de transporte integrados 🚗 e pagamentos locais e internacionais perfeitos 💳. Posso ajudar com reservas de acomodação, opções de Estadia em Grupo, viagens personalizadas Planeje Conosco, cancelamentos e todas as suas necessidades de viagem. Como posso ajudá-lo hoje? 😊",
    ar: "مرحبا! 👋 أنا تويجا 🦒، مساعد السفر الودود الخاص بك في NoLSAF! تمامًا كما تصل الزرافة (تويجا) بأمانة إلى أعلى الأوراق، أنا هنا لمساعدتك في العثور على الإقامة المثالية! 🎯 NoLSAF هي منصتك الموثوقة لحجوزات العقارات الم verifiedة 🏨، وخدمات النقل المتكاملة 🚗، والمدفوعات المحلية والدولية السلسة 💳. يمكنني المساعدة في حجوزات الإقامة، وخيارات الإقامة الجماعية، ورحلات مخصصة خطط معنا، والإلغاءات، وجميع احتياجات السفر الخاصة بك. كيف يمكنني مساعدتك اليوم؟ 😊",
    zh: "你好！👋 我是 Twiga 🦒，您在 NoLSAF 的友好旅行助手！就像长颈鹿（twiga）优雅地够到最高的叶子一样，我在这里帮助您找到完美的住宿！🎯 NoLSAF 是您值得信赖的平台，提供经过验证的房产预订 🏨、综合交通服务 🚗 以及无缝的本地和国际支付 💳。我可以帮助您进行住宿预订、团体住宿选项、与我们计划定制旅行、取消以及您的所有旅行需求。今天我能为您做些什么？😊",
  },
  timeout: {
    en: "Asante sana! 😊 Feel free to come back anytime if you need help with accommodation bookings 🏨, Group Stay 👥, Plan with Us 🎯, or any questions about NoLSAF. Karibu tena! 🎉",
    es: "¡Asante sana! 😊 No dude en volver cuando necesite ayuda con reservas de alojamiento 🏨, Estancia Grupal 👥, Plan con Nosotros 🎯 o cualquier pregunta sobre NoLSAF. ¡Karibu tena! 🎉",
    fr: "Asante sana! 😊 N'hésitez pas à revenir à tout moment si vous avez besoin d'aide pour les réservations d'hébergement 🏨, Séjour de Groupe 👥, Plan avec Nous 🎯 ou toute question sur NoLSAF. Karibu tena! 🎉",
    pt: "Asante sana! 😊 Sinta-se à vontade para voltar a qualquer momento se precisar de ajuda com reservas de acomodação 🏨, Estadia em Grupo 👥, Planeje Conosco 🎯 ou qualquer pergunta sobre NoLSAF. Karibu tena! 🎉",
    ar: "أسانتي سانا! 😊 لا تتردد في العودة في أي وقت إذا كنت بحاجة إلى مساعدة في حجوزات الإقامة 🏨، الإقامة الجماعية 👥، خطط معنا 🎯، أو أي أسئلة حول NoLSAF. كاريبو تينا! 🎉",
    zh: "Asante sana! 😊 如果您需要住宿预订 🏨、团体住宿 👥、与我们计划 🎯 或有关 NoLSAF 的任何问题的帮助，请随时回来。Karibu tena! 🎉",
  },
  default: {
    en: "Hmm, I'm not sure I fully understand that question! 😊 But don't worry - I'm here to help! 🤝 I can assist you with: 🏨 Accommodation bookings, ✅ Verified properties, 👥 Group Stay options, 🎯 Plan with Us custom trips, 🚗 Integrated transport services, 💳 Local & international payments, 📋 Cancellations, and much more! Try asking me something like: 'How do I book a property?', 'What is Group Stay?', 'Tell me about verified properties', or 'What payment methods do you accept?'. What can I help you with today? 😊",
    es: "Hmm, ¡no estoy seguro de entender completamente esa pregunta! 😊 Pero no te preocupes, ¡estoy aquí para ayudar! 🤝 Puedo ayudarte con: 🏨 Reservas de alojamiento, ✅ Propiedades verificadas, 👥 Opciones de Estancia Grupal, 🎯 Viajes personalizados Plan con Nosotros, 🚗 Servicios de transporte integrados, 💳 Pagos locales e internacionales, 📋 Cancelaciones y mucho más! Intenta preguntarme algo como: '¿Cómo reservo una propiedad?', '¿Qué es Estancia Grupal?', 'Cuéntame sobre propiedades verificadas' o '¿Qué métodos de pago aceptan?'. ¿Con qué puedo ayudarte hoy? 😊",
    fr: "Hmm, je ne suis pas sûr de bien comprendre cette question! 😊 Mais ne vous inquiétez pas - je suis là pour vous aider! 🤝 Je peux vous aider avec: 🏨 Réservations d'hébergement, ✅ Propriétés vérifiées, 👥 Options de Séjour de Groupe, 🎯 Voyages personnalisés Plan avec Nous, 🚗 Services de transport intégrés, 💳 Paiements locaux et internationaux, 📋 Annulations et bien plus encore! Essayez de me demander quelque chose comme: 'Comment réserver une propriété?', 'Qu'est-ce que le Séjour de Groupe?', 'Parlez-moi des propriétés vérifiées' ou 'Quels modes de paiement acceptez-vous?'. En quoi puis-je vous aider aujourd'hui? 😊",
    pt: "Hmm, não tenho certeza se entendo completamente essa pergunta! 😊 Mas não se preocupe - estou aqui para ajudar! 🤝 Posso ajudá-lo com: 🏨 Reservas de acomodação, ✅ Propriedades verificadas, 👥 Opções de Estadia em Grupo, 🎯 Viagens personalizadas Planeje Conosco, 🚗 Serviços de transporte integrados, 💳 Pagamentos locais e internacionais, 📋 Cancelamentos e muito mais! Tente me perguntar algo como: 'Como reservo uma propriedade?', 'O que é Estadia em Grupo?', 'Conte-me sobre propriedades verificadas' ou 'Quais métodos de pagamento você aceita?'. Com o que posso ajudá-lo hoje? 😊",
    ar: "حسنًا، لست متأكدًا من أنني أفهم هذا السؤال تمامًا! 😊 لكن لا تقلق - أنا هنا للمساعدة! 🤝 يمكنني مساعدتك في: 🏨 حجوزات الإقامة، ✅ العقارات الم verifiedة، 👥 خيارات الإقامة الجماعية، 🎯 رحلات مخصصة خطط معنا، 🚗 خدمات النقل المتكاملة، 💳 المدفوعات المحلية والدولية، 📋 الإلغاءات وأكثر من ذلك بكثير! جرب أن تسألني شيئًا مثل: 'كيف أحجز عقارًا؟'، 'ما هي الإقامة الجماعية؟'، 'أخبرني عن العقارات الم verifiedة' أو 'ما هي طرق الدفع التي تقبلونها؟'. كيف يمكنني مساعدتك اليوم؟ 😊",
    zh: "嗯，我不太确定我完全理解这个问题！😊 但别担心 - 我在这里帮助您！🤝 我可以帮助您：🏨 住宿预订，✅ 经过验证的房产，👥 团体住宿选项，🎯 与我们计划定制旅行，🚗 综合交通服务，💳 本地和国际支付，📋 取消等等！试着问我一些类似的问题：'我如何预订房产？'，'什么是团体住宿？'，'告诉我经过验证的房产'或'您接受哪些付款方式？'。今天我能为您做些什么？😊",
  },
};

export function getTranslation(key: string, language: LanguageCode = "en"): string {
  const translation = translations[key];
  if (!translation) {
    return translations.default[language] || translations.default.en;
  }
  return translation[language] || translation.en;
}

/**
 * Response identifier mapping - unique phrases that identify each response category
 * Used to match English responses to their translation keys
 */
const responseIdentifiers: { [key: string]: string } = {
  // Greeting - multiple identifiers to catch variations
  "Naitwa Twiga": "greeting",
  "Naitwa Ugali": "greeting", // Legacy support
  "Niaje! 👋 Naitwa": "greeting",
  "your friendly travel assistant at NoLSAF": "greeting",
  
  // Timeout - unique identifier
  "Asante sana! 😊 Feel free": "timeout",
  "Asante sana": "timeout",
  
  // Default - unique identifier
  "I'm not sure I fully understand": "default",
  "Hmm, I'm not sure": "default",
  "But don't worry - I'm here to help": "default",
};

/**
 * Translate an English response to the target language
 * Uses pattern matching to identify the response category and retrieve the translation
 * @param responseType - Optional hint about the response type for better matching
 */
export function translateResponse(
  englishResponse: string, 
  language: LanguageCode,
  responseType?: "greeting" | "timeout" | "default" | "other"
): string {
  // Return English if already in English
  if (language === "en") {
    return englishResponse;
  }

  // If we have a response type hint, use it directly
  if (responseType && responseType !== "other") {
    const translationKey = responseType;
    if (translations[translationKey] && translations[translationKey][language]) {
      return translations[translationKey][language];
    }
  }

  // Normalize the response for matching (remove extra whitespace)
  const normalizedResponse = englishResponse.trim();

  // Try to identify the response category using unique identifiers
  let translationKey: string | null = null;
  
  for (const [identifier, key] of Object.entries(responseIdentifiers)) {
    if (normalizedResponse.includes(identifier)) {
      translationKey = key;
      break;
    }
  }

  // If we found a translation key, return the translated version
  if (translationKey && translations[translationKey]) {
    const translated = translations[translationKey][language];
    if (translated) {
      return translated;
    }
  }

  // Fallback: Try direct pattern matching with known translations
  // Check each translation category by comparing with English versions
  const knownTranslations = {
    greeting: translations.greeting,
    timeout: translations.timeout,
    default: translations.default,
  };

  for (const [key, translationSet] of Object.entries(knownTranslations)) {
    const englishText = translationSet.en;
    
    // More flexible matching: check multiple ways
    // 1. Check if response starts with first 20-40 chars of English translation
    const prefix20 = englishText.substring(0, 20);
    const prefix40 = englishText.substring(0, 40);
    const prefix60 = englishText.substring(0, 60);
    
    if (normalizedResponse.startsWith(prefix20) || 
        normalizedResponse.startsWith(prefix40) ||
        normalizedResponse.includes(prefix60)) {
      return translationSet[language] || englishResponse;
    }
    
    // 2. Check for key phrases that are unique to each category
    if (key === "greeting" && normalizedResponse.includes("Naitwa Twiga")) {
      return translationSet[language] || englishResponse;
    }
    if (key === "timeout" && normalizedResponse.includes("Asante sana")) {
      return translationSet[language] || englishResponse;
    }
    if (key === "default" && normalizedResponse.includes("I'm not sure I fully understand")) {
      return translationSet[language] || englishResponse;
    }
  }

  // Final fallback: return English (can be enhanced with translation API later)
  // Log for debugging
  console.log(`[Translation] No match found for response (lang: ${language}):`, normalizedResponse.substring(0, 50));
  return englishResponse;
}

