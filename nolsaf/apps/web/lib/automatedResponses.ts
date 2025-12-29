/**
 * Automated Response System for NoLSAF
 * Handles primary communications without AI API costs
 * Reusable across different sections of the platform
 */

export function getAutomatedResponse(userInput: string): string {
  const input = userInput.toLowerCase().trim();

  // === GREETINGS & INITIAL CONTACT ===
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|greetings|jambo|habari|mambo|niaje)/.test(input)) {
    return "Niaje! 👋 Naitwa Twiga 🦒, your friendly travel assistant at NoLSAF! Just like the giraffe (twiga) gracefully reaches for the highest leaves, I'm here to help you find the perfect accommodation! 🎯 NoLSAF is your trusted platform for verified property bookings 🏨, integrated transport services 🚗, and seamless local & international payments 💳. I can help with accommodation bookings, Group Stay options, Plan with Us custom trips, cancellations, and all your travel needs. How can I assist you today? 😊";
  }

  // === ABOUT NOLSAF ===
  if (/(what is nolsaf|what's nolsaf|about nolsaf|nolsaf is|tell me about nolsaf|who is nolsaf)/.test(input)) {
    return "NoLSAF is East Africa's trusted accommodation booking platform 🌍! 🏨 Our PRIMARY focus is verified property bookings across Tanzania 🇹🇿, Kenya 🇰🇪, Uganda 🇺🇬, and Rwanda 🇷🇼. We also offer: 🚗 Integrated transport/riding services, 💳 Local & international payment support, 🎯 Plan with Us (custom trip planning), 👥 Group Stay options, ✅ Verified properties with trust & safety, and 📋 Flexible cancellation policies. All properties are verified ✅ before listing. Book with confidence! Ready to find your perfect stay? 🎉";
  }

  // === INTEGRITY & SAFETY / VERIFIED PROPERTIES ===
  if (/(safe|safety|secure|security|trust|trusted|reliable|legitimate|legit|scam|fraud|verified|authentic|integrity|verification|verify)/.test(input)) {
    return "NoLSAF prioritizes trust and safety 🔒! All properties are VERIFIED ✅ before listing - we check property ownership, authenticity, and quality. We verify ✅ all property owners, use secure 🔐 payment systems (local & international), and have professional support 👥. Every listing is vetted for safety, accuracy, and legitimacy. We have customer support 📞 and clear cancellation policies 📋. Your accommodation bookings are protected 🛡️. Book with confidence - all properties are verified! 💪";
  }

  // === BOOKING QUESTIONS ===
  if (/(how can i book|how do i book|how to book|book a|make a booking|reserve|reservation|i want to book|book now|booking process)/.test(input)) {
    return "Booking accommodations with NoLSAF is super simple! 😊 Here's how: 🏨 Browse our verified property listings, select your dates 📅 and number of guests 👥, choose your payment method 💳 (local or international), and confirm! We also offer: 🚗 Integrated transport services when you book, 👥 Group Stay options for larger groups, and 🎯 Plan with Us for custom trip planning. All properties are verified ✅ and support flexible cancellations. Ready to book? Let's find your perfect stay! 💬";
  }

  // === BOOKING REQUIREMENTS / PREPARATION ===
  if (/(what do i need to book|requirements to book|documents needed|account needed|sign up|register|create account)/.test(input)) {
    return "To book with NoLSAF, you'll need: 👤 An account (sign up is quick and free!), 📧 A valid email address, 💳 A payment method (credit card, mobile money, or bank transfer), and 📱 Basic travel information (dates, destination). Creating an account takes just a few minutes and gives you access to all our services! Ready to get started? Visit our registration page! 🚀";
  }

  // === BOOKING CHALLENGES / ISSUES ===
  if (/(booking problem|booking issue|can't book|unable to book|booking error|booking failed|payment issue|payment problem|booking challenge)/.test(input)) {
    return "I'm sorry you're experiencing booking difficulties 😔. Let's fix this together! 💪 Common solutions: 1️⃣ Clear your browser cache and try again, 2️⃣ Ensure all required fields are filled ✅, 3️⃣ Check your payment method details 💳, 4️⃣ Try a different browser or device 📱. For immediate assistance, please contact our support team 📞 through your account or use the contact form. They can help resolve booking issues quickly! ⚡";
  }

  // === CANCELLATIONS ===
  if (/(cancel|cancellation|refund|change booking|modify|reschedule|cancel policy)/.test(input)) {
    return "Cancellation policies vary by service type 📋, but we make it easy! ✅ Most bookings can be cancelled within your account. Refund eligibility 💰 depends on cancellation timing (check individual property/service policies). To cancel: Go to 'My Bookings' in your account and select 'Cancel' ❌. For changes or rescheduling 🔄, contact support or the property owner directly. Free cancellation periods are clearly stated during booking! 🎯 Need help with a specific cancellation? I'm here! 💬";
  }

  // === PROPERTIES / ACCOMMODATIONS ===
  if (/(property|properties|accommodation|hotel|lodge|resort|apartment|villa|stay|where to stay|place to stay|room|rooms|guest house|hostel)/.test(input)) {
    return "NoLSAF is your trusted accommodation booking platform 🏨 across East Africa! We offer verified ✅ properties from budget-friendly 💰 to luxury ⭐ - hotels 🏢, lodges 🏡, apartments 🏠, villas 🏖️, guest houses, and unique stays in Tanzania 🇹🇿, Kenya 🇰🇪, Uganda 🇺🇬, and Rwanda 🇷🇼. All properties are verified before listing ✅. Each listing includes: 📸 Photos, ✨ Amenities, 📍 Location, ⭐ Reviews, 💳 Payment options (local & international), and 📋 Cancellation policies. Filter by price, location, or amenities! Need help finding the perfect stay? I'm here! 🎯";
  }

  // === PROPERTY AMENITIES / FEATURES ===
  if (/(amenities|wifi|parking|pool|breakfast|air conditioning|facilities|features|what's included)/.test(input)) {
    return "Each property on NoLSAF lists all amenities and features! 🎉 Common amenities include: 📶 WiFi, 🅿️ Parking, 🏊 Pool, 🍳 Breakfast, ❄️ Air conditioning, 🏋️ Gym, 🍽️ Restaurant, and more! Check individual property listings for complete details. Need a property with specific amenities? Use our filters 🔍 to search by what matters to you! Looking for something specific? Just let me know! 😊";
  }

  // === PROPERTY OWNERS ===
  if (/(property owner|owner|list property|become owner|rent property|host|landlord)/.test(input)) {
    return "Property owners can join NoLSAF to list their accommodations 🏨 and reach travelers across East Africa! 🌍 Benefits include: ✅ Verified listings, 🔒 Secure payments, 👥 Professional support, and 📈 Access to a growing traveler base. To become an owner: Sign up as an owner 👤, verify your property ✅, complete your listing with photos 📸 and details 📝, and start receiving bookings! 💰 Our team helps with onboarding and property verification. Ready to grow your business? Let's get started! 🚀";
  }

  // === TRANSPORT / RIDES ===
  if (/(transport|ride|taxi|vehicle|car|bus|driver|pickup|drop off|travel|traveling|get to)/.test(input)) {
    return "NoLSAF provides reliable transport services 🚗 across East Africa! Options include: 🚙 Private vehicles, 🚌 Shared transport, ✈️ Airport transfers, and 🗺️ Intercity travel. Our verified ✅ drivers offer safe 🔒, comfortable rides. Book transport through your account, specifying pickup/drop-off locations 📍 and travel dates 📅. All drivers are professional 👨‍✈️ and vehicles are regularly maintained 🔧. Need transport for your trip? We can arrange it! Just let me know your requirements! 😊";
  }

  // === DESTINATIONS - TANZANIA ===
  if (/(tanzania|dar es salaam|zanzibar|serengeti|kilimanjaro|arusha|stone town|ngorongoro|tanzanian)/.test(input)) {
    return "Tanzania offers incredible travel experiences! 🇹🇿 Popular destinations: 🏖️ Zanzibar (beaches, Stone Town, spice tours), 🦁 Serengeti (safaris, migration), ⛰️ Mount Kilimanjaro (trekking), 🦏 Ngorongoro Crater (wildlife), 🌄 Arusha (gateway to northern parks), and 🌊 Dar es Salaam (coastal city). Our agents specialize in Tanzania travel and can create custom itineraries 🗺️. We offer accommodations 🏨 and transport 🚗 throughout Tanzania. What area interests you most? Let's plan your Tanzanian adventure! 🎉";
  }

  // === DESTINATIONS - KENYA ===
  if (/(kenya|nairobi|masai mara|maasai mara|mombasa|malindi|lamu|kenyan)/.test(input)) {
    return "Kenya is a fantastic destination! 🇰🇪 Highlights include: 🦁 Maasai Mara (safaris, Great Migration), 🏙️ Nairobi (capital city, wildlife sanctuaries), 🏖️ Mombasa (coastal beaches), 🌴 Malindi (beach resorts), 🏝️ Lamu (historic island), and numerous national parks 🦓. We offer properties 🏨 and transport 🚗 throughout Kenya. Our team can help plan your Kenyan adventure - from beach holidays 🏖️ to safari experiences 🦁. Interested in a specific region? Let's explore Kenya together! 😊";
  }

  // === DESTINATIONS - UGANDA ===
  if (/(uganda|kampala|jinja|gorilla|gorillas|bwindi|ugandan)/.test(input)) {
    return "Uganda is known as the 'Pearl of Africa'! 🇺🇬 Key attractions: 🦍 Gorilla trekking in Bwindi, 🏙️ Kampala (capital city), 🌊 Jinja (Nile source, adventure activities), 🦁 National parks, and stunning landscapes ⛰️. We offer accommodations 🏨 and transport services 🚗 throughout Uganda. Our agents can arrange gorilla trekking permits 🎫 and create comprehensive Ugandan itineraries 🗺️. Planning a visit? We can help! Ready to explore the Pearl of Africa? 🎉";
  }

  // === CULTURE & EXPERIENCES ===
  if (/(culture|cultural|tradition|traditional|local|tribe|tribal|masai|maasai|swahili|experience|authentic)/.test(input)) {
    return "East Africa is rich in cultural experiences! 🎭 Explore: 🏘️ Maasai culture and villages, 🕌 Swahili traditions (especially in Zanzibar and coastal areas), 🛒 Local markets, 💃 Traditional dances, 🎨 Cultural tours, and authentic local experiences ✨. Our 'Plan with Us' service can include cultural immersion activities 🎯. We work with local guides 👥 and communities to offer authentic, respectful cultural experiences. What cultural aspects interest you? Let's create a culturally rich journey! 🌍";
  }

  // === SAFARI / WILDLIFE ===
  if (/(safari|wildlife|animal|animals|game drive|big five|lion|elephant|giraffe|zebra|wildebeest|migration)/.test(input)) {
    return "East Africa is world-renowned for safaris and wildlife! 🦁 Experience: 🦓 The Great Migration (Serengeti/Maasai Mara), 🐘 Big Five viewing, 🚙 Game drives in national parks, 🚶 Walking safaris, and diverse ecosystems 🌍. We offer safari packages 📦 and accommodations 🏨 in prime wildlife areas. Our agents specialize in creating unforgettable safari experiences with professional guides 👨‍✈️ and comfortable lodges ⛺. Planning a safari? Let's design your perfect wildlife adventure! Ready to witness nature's greatest show? 🎬";
  }

  // === PLAN WITH US / CUSTOM TRIPS ===
  if (/(plan|trip planning|custom|itinerary|itineraries|personalized|tailored|request|plan with us)/.test(input)) {
    return "Our 'Plan with Us' service helps create custom trip plans! 🗺️ How it works: 📝 Submit a request with your travel dates 📅, accommodation preferences 🏨, budget 💰, group size 👥, and any special needs. Our experienced agents 👨‍💼 review your request and create a personalized plan focusing on verified accommodations 🏨, integrated transport 🚗, and activities 🎉. This service complements our primary accommodation booking platform - perfect when you want expert help planning your stay! Ready to submit your request? Let's make it happen! 🚀";
  }

  // === PRICING / COST / BUDGET ===
  if (/(price|cost|budget|affordable|cheap|expensive|how much|pricing|fee|fees|payment method|discount|promotion|special offer)/.test(input)) {
    return "NoLSAF offers accommodation options for all budgets! 💰 Property prices vary by type and location (budget 💵 to luxury ⭐). All prices are clearly displayed during booking ✅. Payment methods: 📱 Mobile money (M-Pesa, Airtel Money, Tigo Pesa), 🏦 Bank transfers, 💳 Credit/debit cards (Visa, Mastercard) - supporting both local and international payments! Group Stay bookings may qualify for discounts 💰. Use our filters 🔍 to find options within your budget. Need help finding the perfect stay for your budget? I can guide you! 😊";
  }

  // === PAYMENT METHODS DETAILED ===
  if (/(mobile money|mpesa|airtel money|tigo pesa|bank transfer|credit card|debit card|paypal|cash|payment option)/.test(input)) {
    return "NoLSAF supports multiple payment methods for your convenience! 💳 Options include: 📱 Mobile money (M-Pesa, Airtel Money, Tigo Pesa), 🏦 Bank transfers, 💳 Credit/debit cards (Visa, Mastercard), and secure online payments 🔒. All transactions are processed securely. Payment options are displayed during checkout. Need help with a specific payment method? Our support team can assist! 😊";
  }

  // === STATUS / TRACKING / CHECK ===
  if (/(status|check|track|where|when|my booking|booking status|confirm|confirmation)/.test(input)) {
    return "To check your booking status ✅: Log in to your account and visit 'My Bookings' 📋 (for properties/transport) or 'Event Plans' 🗓️ (for custom trips). You'll see real-time updates ⚡, confirmation details 📄, and next steps ➡️. For custom trip requests, check 'Plan with Us' requests for agent responses 💬 and itinerary updates 🗺️. All bookings include confirmation emails 📧. Need help finding a specific booking? Contact support 📞 or I can help guide you! 😊";
  }

  // === CONTACT / SUPPORT ===
  if (/(contact|support|help|phone|email|talk to|speak with|reach|customer service|assistance)/.test(input)) {
    return "Our support team is here to help! 💪 Contact options: 💬 Use the support section in your account for messages, 📧 Email us directly, or 📞 Call our support line (contact details in your account). For urgent matters ⚡, use phone support. Our team assists with bookings ✈️, changes 🔄, questions ❓, and any issues 🛠️. We're committed to ensuring your NoLSAF experience is smooth ✨. What do you need help with? I'm here, or our support team is ready! 😊";
  }

  // === AGENTS / EXPERTS ===
  if (/(agent|expert|specialist|guide|travel agent|assistance|professional)/.test(input)) {
    return "NoLSAF works with experienced travel agents 👨‍💼 specializing in East Africa! Our agents: 🗺️ Understand local destinations, ✨ Create custom itineraries, 🏨 Arrange accommodations and transport 🚗, 🎭 Provide cultural insights, and 📋 Handle trip logistics. Agents are assigned through 'Plan with Us' requests 🎯. They're knowledgeable about Tanzania 🇹🇿, Kenya 🇰🇪, Uganda 🇺🇬, and Rwanda 🇷🇼, and can make your travel planning effortless! 💪 Want to work with an agent? Submit a trip planning request! Let's connect you with an expert! 🚀";
  }

  // === BEST TIME TO VISIT / WEATHER ===
  if (/(when to visit|best time|weather|season|dry season|wet season|rain|climate)/.test(input)) {
    return "Best times to visit East Africa vary by activity! 📅 Safari viewing 🦁 (dry seasons - June-October, December-February), 🏖️ Beach holidays (year-round, best during dry seasons ☀️), 🦍 Gorilla trekking (year-round, dry seasons are easier), 🦓 Wildlife migration (varies by location). Each country has unique seasonal patterns 🌍. Our agents can recommend ideal travel times based on your interests 🎯. Planning your trip? We can suggest the best timing! Want perfect weather? Let's plan it right! 😊";
  }

  // === VISA / DOCUMENTS / REQUIREMENTS ===
  if (/(visa|passport|document|requirement|permit|entry|border|cross border)/.test(input)) {
    return "Travel requirements for East Africa: 📋 Most countries require valid passports 🛂 (6+ months validity). Visa requirements vary - some offer visa-on-arrival ✅, others need advance application 📝. Some countries have East African Tourist Visa allowing multiple entries 🎫. For gorilla trekking 🦍, permits are required (booked in advance). Check specific country requirements before travel 🌍. Our team can provide guidance 💬, but please verify with official sources ✅. Need help understanding requirements? I can point you in the right direction! 😊";
  }

  // === GROUP STAY / GROUP TRAVEL ===
  if (/(group stay|group|groups|family|families|large group|many people|corporate|team|group accommodation)/.test(input)) {
    return "NoLSAF's Group Stay service is perfect for larger groups! 👥 We specialize in: 👨‍👩‍👧‍👦 Family accommodations, 🏢 Corporate group bookings, 🎉 Large parties, and special events 🎊. Group Stay offers: ✅ Verified properties suitable for groups, 💰 Special group rates and discounts, 🏨 Multiple room options, 🚗 Integrated transport arrangements, and 📋 Flexible group cancellation policies. All group accommodations are verified ✅ before listing. Planning a group stay? Browse our Group Stay options or submit a 'Plan with Us' request! Let's make your group trip unforgettable! 🎉";
  }

  // === REVIEWS / RATINGS / TESTIMONIALS ===
  if (/(review|rating|testimonial|feedback|experience|recommend|recommendation)/.test(input)) {
    return "NoLSAF values authentic feedback! ⭐ Property and service reviews help other travelers make informed decisions 💡. You can leave reviews after your stay/experience ✍️. Reviews are verified ✅ to ensure authenticity. We display ratings and reviews on all listings 📋. Positive reviews help property owners and our platform improve 📈. Had a great experience? Please share your feedback! Questions about a property? Check its reviews! Your opinion matters! 💪";
  }

  // === ACCOUNT / PROFILE / LOGIN ===
  if (/(account|profile|login|log in|sign in|my account|dashboard|password|forgot password|reset password)/.test(input)) {
    return "Managing your NoLSAF account is easy! 👤 To log in: Use your email and password on the login page. Forgot your password? Use the 'Forgot Password' link to reset it 🔐. In your account dashboard, you can: 📋 View bookings, ✏️ Update profile, 💬 Message hosts/agents, ⭐ Leave reviews, and 🔔 Manage notifications. Need help with your account? Contact our support team 📞! They're here to help! 😊";
  }

  // === CONFIRMATION / RECEIPT / TICKET ===
  if (/(confirmation|receipt|ticket|booking confirmation|voucher|booking number|reference)/.test(input)) {
    return "After booking with NoLSAF, you'll receive: ✅ A booking confirmation email 📧 with your booking reference number, 📄 A digital receipt/ticket, and 📱 All details in your account dashboard. Keep your booking reference number handy! You'll need it for check-ins and any inquiries. Can't find your confirmation? Check your email or log into your account. Need help locating a booking? I'm here! 😊";
  }

  // === CHECK-IN / CHECK-OUT ===
  if (/(check in|checkout|check out|arrival|departure|early check in|late checkout|check in time)/.test(input)) {
    return "Check-in and check-out details vary by property! 🏨 Standard times are usually: Check-in from 2-3 PM ⏰, Check-out before 11 AM-12 PM. Early check-in or late checkout may be available (subject to availability and sometimes extra fees). Contact your property directly or message them through your booking to arrange special times. Need specific information? Check your booking confirmation or property listing! 😊";
  }

  // === TRAVEL INSURANCE ===
  if (/(insurance|travel insurance|covered|protection|liability|medical insurance)/.test(input)) {
    return "Travel insurance is always recommended for international trips! 🛡️ While NoLSAF doesn't provide travel insurance, we recommend purchasing it separately to cover: 🏥 Medical emergencies, ✈️ Trip cancellations, 🧳 Lost luggage, and other unforeseen circumstances. Check with your local insurance providers or travel agencies. Some credit cards also offer travel insurance benefits! Having insurance gives you peace of mind while traveling! 😊";
  }

  // === PACKING / WHAT TO BRING ===
  if (/(packing|what to bring|what to pack|clothing|luggage|suitcase|essentials|packing list)/.test(input)) {
    return "What to pack depends on your destination and activities! 🎒 For safaris: Neutral colors (khaki, beige), comfortable shoes 👟, camera 📸, and binoculars. For beach destinations: Swimwear 🏖️, sunscreen 🧴, and light clothing. For mountain trekking: Warm layers, hiking boots ⛰️, and proper gear. Weather varies by season and location - check forecasts before packing! Need packing tips for a specific destination? Our agents can help! 😊";
  }

  // === HEALTH / VACCINATIONS / MEDICAL ===
  if (/(vaccination|vaccine|yellow fever|malaria|medical|health|doctor|hospital|clinic|pharmacy)/.test(input)) {
    return "Health requirements vary by destination! 💉 Yellow fever vaccination is required for some East African countries. Malaria prevention is recommended in many areas (consult your doctor). Always check current health requirements before traveling and visit a travel clinic for up-to-date advice 🏥. Bring necessary medications, a basic first aid kit, and know the location of medical facilities at your destination. Health is important - prepare well! 😊";
  }

  // === LANGUAGE / COMMUNICATION ===
  if (/(language|languages|swahili|english|speak|communication|translator|translation|local language)/.test(input)) {
    return "East Africa is multilingual! 🗣️ Swahili is widely spoken across the region, English is official in most countries, and local languages vary by area. Basic Swahili phrases like 'Jambo' (Hello), 'Asante' (Thank you), and 'Karibu' (Welcome) are always appreciated! Many people in tourism speak English. Our agents and property staff typically speak English. Don't worry about language barriers - locals are friendly and helpful! 😊";
  }

  // === CURRENCY / MONEY / EXCHANGE ===
  if (/(currency|money|exchange rate|usd|dollar|shilling|kenyan shilling|tanzanian shilling|ugandan shilling|cash|atm|bank)/.test(input)) {
    return "East Africa uses different currencies! 💵 Tanzania: Tanzanian Shilling (TZS), Kenya: Kenyan Shilling (KES), Uganda: Ugandan Shilling (UGX), Rwanda: Rwandan Franc (RWF). USD is often accepted in tourist areas. Exchange rates fluctuate - check current rates before travel. ATMs are available in major cities and towns 🏧. Credit cards accepted at hotels and larger establishments. It's good to have some local currency for small purchases and tips! Need currency advice? Let me know! 😊";
  }

  // === TIPPING / GRATUITY ===
  if (/(tip|tipping|gratuity|service charge|how much to tip|should i tip)/.test(input)) {
    return "Tipping customs in East Africa: 💰 Tips are appreciated but not always mandatory. For guides and drivers: 10-15% or $5-20 per day depending on service. For restaurants: 5-10% if service charge isn't included. For hotel staff: Small amounts for bellboys, housekeeping. Always tip based on service quality and your budget. Local currency is preferred for tips. When in doubt, ask your guide or hotel staff about local customs! 😊";
  }

  // === PHOTOGRAPHY / CAMERAS ===
  if (/(camera|photography|photos|pictures|video|drone|permit|can i take photos)/.test(input)) {
    return "Photography rules vary by location! 📸 In national parks and reserves: Cameras allowed, professional photography may need permits 📜. Drones: Usually require special permits - check regulations before bringing one 🚁. Some cultural sites: Photography may be restricted or require fees. Always ask permission before photographing people, especially in rural areas. Our agents can advise on photography permits for specific destinations. Capture your memories respectfully! 😊";
  }

  // === INTERNET / CONNECTIVITY ===
  if (/(internet|wifi|connection|data|mobile data|roaming|network|sim card|phone|connectivity)/.test(input)) {
    return "Internet connectivity in East Africa: 📶 WiFi is available in most hotels, lodges, and restaurants in cities. Mobile data networks (3G/4G) are good in urban areas, coverage varies in remote locations. You can buy local SIM cards at airports or shops 📱. Major networks include: Safaricom, Airtel, Vodacom. Roaming charges apply with international SIMs. Some remote safari areas have limited connectivity - perfect for unplugging! Need connectivity tips? Let me know your destination! 😊";
  }

  // === FOOD / DINING / RESTAURANTS ===
  if (/(food|restaurant|dining|meal|cuisine|what to eat|local food|dietary|vegetarian|vegan|halal|kosher)/.test(input)) {
    return "East African cuisine is diverse and delicious! 🍽️ Local favorites: Ugali with stew, nyama choma (grilled meat), pilau rice, chapati, and fresh tropical fruits. Restaurants range from local eateries to international cuisine. Most hotels offer breakfast, many include dinner options. Dietary restrictions? Many places accommodate vegetarian, vegan, halal, and other dietary needs - just mention when booking! Street food is popular but choose busy stalls. Ready to taste East Africa? 😊";
  }

  // === SHOPPING / SOUVENIRS / MARKETS ===
  if (/(shopping|market|souvenir|gift|buy|purchase|curio|handicraft|bargaining|haggle)/.test(input)) {
    return "Shopping in East Africa is an adventure! 🛍️ Popular items: Handmade crafts, Maasai jewelry, wood carvings, textiles, coffee, tea, and spices. Local markets are great for authentic goods - practice friendly bargaining! 🗣️ Prices are often negotiable in markets. Fixed prices in shops and malls. Quality varies, so inspect items carefully. Our agents can recommend the best shopping spots and fair prices. Support local artisans and bring home unique memories! 😊";
  }

  // === SAFETY / SECURITY TIPS ===
  if (/(safe to travel|is it safe|safety tips|security advice|travel warning|travel advisory)/.test(input)) {
    return "East Africa is generally safe for travelers! 🛡️ Safety tips: Stay aware of your surroundings, keep valuables secure, use hotel safes, avoid displaying expensive items, follow local advice, and respect local customs. Most tourist areas are well-policed. We recommend: Travel insurance, registering with your embassy, keeping copies of documents, and sharing itineraries with family. Our verified properties prioritize guest safety. For current advisories, check your government's travel website. Travel smart! 😊";
  }

  // === EMERGENCY / HELP ===
  if (/(emergency|urgent|help|stuck|problem|lost|stolen|accident|need help|immediate assistance)/.test(input)) {
    return "For emergencies in East Africa: 🚨 Police: 999 (general), Medical: 911/112, Fire: 999. Contact your country's embassy for serious issues. NoLSAF support: Use your account's support section for booking-related emergencies 📞. Keep important numbers saved: Your hotel, transport provider, and travel agent. If something happens during your trip, stay calm and contact local authorities or your accommodation immediately. We're here to help with booking-related issues! Stay safe! 😊";
  }

  // === FAMILY / CHILDREN TRAVEL ===
  if (/(family|children|kids|baby|infant|child friendly|family friendly|age|children activities)/.test(input)) {
    return "East Africa welcomes families! 👨‍👩‍👧‍👦 Family-friendly accommodations are available with amenities like family rooms, cots, and children's menus. Many safari lodges welcome children (age restrictions may apply for certain activities). Child-friendly activities: Wildlife viewing, beach activities, cultural visits, and educational experiences. Some properties offer babysitting services. When booking, mention children's ages so we can recommend suitable options. Family trips create amazing memories! Ready to plan your family adventure? 😊";
  }

  // === ACCESSIBILITY / SPECIAL NEEDS ===
  if (/(accessible|disability|wheelchair|mobility|special needs|accessible room|handicap)/.test(input)) {
    return "NoLSAF is committed to accessible travel! ♿ Accessibility varies by property - check listings for accessible features. Some properties offer: Wheelchair accessible rooms, ramps, elevators, and accessible bathrooms. Safari vehicles may have limitations. Contact properties directly or mention your needs when booking so we can find suitable options. Our agents can help find accessible accommodations and activities. Everyone deserves great travel experiences! Need specific accessibility information? Let me know! 😊";
  }

  // === COMPARISON / RECOMMENDATIONS ===
  if (/(compare|comparison|which is better|recommend|suggestion|best option|should i choose|difference between)/.test(input)) {
    return "Choosing the perfect option depends on your preferences! 🤔 Consider: Budget 💰, Location preference 📍, Travel style (adventure, luxury, budget), Group size 👥, Activities you want, and Travel dates 📅. Our 'Plan with Us' service is perfect for getting personalized recommendations! Our agents know East Africa well and can suggest options based on what matters to you. Want specific comparisons? Tell me what you're considering and I can help you decide! 😊";
  }

  // === SEASONAL / WEATHER SPECIFIC ===
  if (/(rainy season|dry season|monsoon|best weather|hot|cold|temperature|climate|season)/.test(input)) {
    return "East Africa has distinct seasons! 🌦️ Dry seasons (June-October, December-February): Ideal for safaris and wildlife viewing, less rain, cooler temperatures. Wet/rainy seasons (March-May, November): Lush landscapes, fewer tourists, lower prices, but roads may be challenging. Coastal areas: Year-round warm weather, dry seasons best. Mountain regions: Cooler, can be cold at night. Weather varies by elevation and location! Want to know the best season for your specific plans? I can help! 😊";
  }

  // === GENERAL INFORMATION ===
  if (/(what|who|tell me|explain|information|details|about)/.test(input)) {
    return "NoLSAF is East Africa's trusted accommodation booking platform 🌍! Our PRIMARY focus: 🏨 Verified property bookings across Tanzania 🇹🇿, Kenya 🇰🇪, Uganda 🇺🇬, and Rwanda 🇷🇼. We also offer: 🚗 Integrated transport/riding services, 💳 Local & international payment support, 👥 Group Stay options, 🎯 Plan with Us (custom trip planning), ✅ Verified properties with trust & safety, and 📋 Flexible cancellation policies. All properties are verified before listing. Book your perfect stay with confidence! 💪 What would you like to know more about? 😊";
  }

  // === GOODBYE / CLOSING ===
  if (/(goodbye|bye|see you|farewell|thank you|thanks|that's all|done|finish|close|end|exit|quit|asante)/.test(input)) {
    return "Asante sana! (Thank you very much!) 😊 It was great helping you! I'm always here whenever you need assistance with accommodation bookings 🏨, Group Stay options 👥, Plan with Us trips 🎯, verified properties ✅, or any questions about NoLSAF 🌍. Have a wonderful journey, and I hope to help you find your perfect stay! Karibu tena! (Welcome again!) Safe travels! 🎉✨";
  }

  // === DEFAULT RESPONSE (for unmatched messages) ===
  return "Hmm, I'm not sure I fully understand that question! 😊 But don't worry - I'm here to help! 🤝 I can assist you with: 🏨 Accommodation bookings, ✅ Verified properties, 👥 Group Stay options, 🎯 Plan with Us custom trips, 🚗 Integrated transport services, 💳 Local & international payments, 📋 Cancellations, and much more! Try asking me something like: 'How do I book a property?', 'What is Group Stay?', 'Tell me about verified properties', or 'What payment methods do you accept?'. What can I help you with today? 😊";
}

/**
 * Get the timeout conclusion message when user is inactive
 */
export function getTimeoutMessage(language: string = "en"): string {
  const lang = (language || "en").toLowerCase();

  // Simple local handling: return Swahili when requested, otherwise English.
  if (lang.startsWith("sw")) {
    return "Asante sana! 😊 Rudisha tena wakati wowote ukihitaji msaada kuhusu malazi 🏨, Group Stay 👥, Plan with Us 🎯, au maswali yoyote kuhusu NoLSAF. Karibu tena! 🎉";
  }

  // For frontend, return English for now (translations handled by API)
  return "Asante sana! 😊 Feel free to come back anytime if you need help with accommodation bookings 🏨, Group Stay 👥, Plan with Us 🎯, or any questions about NoLSAF. Karibu tena! 🎉";
}

