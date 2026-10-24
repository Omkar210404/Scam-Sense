import type { Lang, Reason, Verdict } from './engine.ts';

type T = Record<Lang, string>;

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिंदी' },
  { id: 'mr', label: 'मराठी' },
];

export const UI = {
  tagline: { en: 'Is this message a scam?', hi: 'क्या यह मैसेज धोखा है?', mr: 'हा मेसेज फसवणूक आहे का?' },
  privacy: {
    en: 'Checked on your phone. Your message is never sent anywhere.',
    hi: 'जाँच आपके फ़ोन पर ही होती है। आपका मैसेज कहीं नहीं भेजा जाता।',
    mr: 'तपासणी तुमच्या फोनवरच होते. तुमचा मेसेज कुठेही पाठवला जात नाही.',
  },
  pasteLabel: { en: 'Paste the message here', hi: 'मैसेज यहाँ पेस्ट करें', mr: 'मेसेज इथे पेस्ट करा' },
  placeholder: {
    en: 'Long-press the message, tap Copy, then paste it here…',
    hi: 'मैसेज को दबाकर रखें, कॉपी दबाएँ, फिर यहाँ पेस्ट करें…',
    mr: 'मेसेज दाबून ठेवा, कॉपी दाबा, मग इथे पेस्ट करा…',
  },
  check: { en: 'Check message', hi: 'मैसेज जाँचें', mr: 'मेसेज तपासा' },
  paste: { en: 'Paste', hi: 'पेस्ट करें', mr: 'पेस्ट करा' },
  clear: { en: 'Clear', hi: 'मिटाएँ', mr: 'पुसा' },
  empty: { en: 'Paste or type a message first.', hi: 'पहले कोई मैसेज पेस्ट या टाइप करें।', mr: 'आधी मेसेज पेस्ट किंवा टाइप करा.' },
  pasteFailed: {
    en: 'Could not read the clipboard. Long-press the box and choose Paste.',
    hi: 'क्लिपबोर्ड नहीं पढ़ पाए। बॉक्स को दबाकर रखें और पेस्ट चुनें।',
    mr: 'क्लिपबोर्ड वाचता आला नाही. बॉक्स दाबून ठेवा आणि पेस्ट निवडा.',
  },
  examples: { en: 'Try an example', hi: 'कोई उदाहरण आज़माएँ', mr: 'एखादे उदाहरण वापरून पहा' },
  why: { en: 'Why', hi: 'क्यों', mr: 'का' },
  todo: { en: 'What to do', hi: 'क्या करें', mr: 'काय करावे' },
  yourMessage: { en: 'Your message', hi: 'आपका मैसेज', mr: 'तुमचा मेसेज' },
  legendDanger: { en: 'warning sign', hi: 'चेतावनी', mr: 'धोक्याचे लक्षण' },
  legendWarn: { en: 'be careful', hi: 'सावधान', mr: 'सावध' },
  legendLink: { en: 'link (do not open)', hi: 'लिंक (न खोलें)', mr: 'लिंक (उघडू नका)' },
  note: { en: 'This is guidance, not proof.', hi: 'यह सलाह है, सबूत नहीं।', mr: 'हा सल्ला आहे, पुरावा नाही.' },
  again: { en: 'Check another message', hi: 'दूसरा मैसेज जाँचें', mr: 'दुसरा मेसेज तपासा' },
  install: { en: 'Install app', hi: 'ऐप इंस्टॉल करें', mr: 'ॲप इन्स्टॉल करा' },
  installWhy: {
    en: 'Install it to check messages straight from the Share menu.',
    hi: 'इंस्टॉल करें, ताकि शेयर मेनू से सीधे मैसेज जाँच सकें।',
    mr: 'इन्स्टॉल करा, म्हणजे शेअर मेनूमधून थेट मेसेज तपासता येईल.',
  },
  iosHint: {
    en: 'On iPhone: tap Share, then “Add to Home Screen”. Sharing a message into the app works on Android only, so on iPhone paste the message.',
    hi: 'iPhone पर: शेयर दबाएँ, फिर “Add to Home Screen”। ऐप में मैसेज शेयर करना सिर्फ़ Android पर चलता है, इसलिए iPhone पर मैसेज पेस्ट करें।',
    mr: 'iPhone वर: शेअर दाबा, मग “Add to Home Screen”. ॲपमध्ये मेसेज शेअर करणे फक्त Android वर चालते, म्हणून iPhone वर मेसेज पेस्ट करा.',
  },
  how: { en: 'How it works', hi: 'कैसे काम करता है', mr: 'कसे वापरायचे' },
  onbTitle: { en: 'Check a message in 2 taps', hi: '2 टैप में मैसेज जाँचें', mr: '2 टॅपमध्ये मेसेज तपासा' },
  step1: { en: 'Long-press the message and tap Share.', hi: 'मैसेज को दबाकर रखें और शेयर दबाएँ।', mr: 'मेसेज दाबून ठेवा आणि शेअर दाबा.' },
  step2: { en: 'Choose ScamSense.', hi: 'ScamSense चुनें।', mr: 'ScamSense निवडा.' },
  step3: { en: 'See the answer at once.', hi: 'तुरंत जवाब देखें।', mr: 'लगेच उत्तर पहा.' },
  onbNote: {
    en: 'Sharing works on Android after you install the app. You can always paste a message instead.',
    hi: 'ऐप इंस्टॉल करने के बाद Android पर शेयर करना काम करता है। आप हमेशा मैसेज पेस्ट भी कर सकते हैं।',
    mr: 'ॲप इन्स्टॉल केल्यावर Android वर शेअर करणे चालते. तुम्ही नेहमी मेसेज पेस्टही करू शकता.',
  },
  gotIt: { en: 'Got it', hi: 'समझ गया', mr: 'समजले' },
  readIn: { en: 'Read in English', hi: 'हिंदी में पढ़ें', mr: 'मराठीत वाचा' },
  themeLight: { en: 'Switch to light mode', hi: 'लाइट मोड', mr: 'लाइट मोड' },
  themeDark: { en: 'Switch to dark mode', hi: 'डार्क मोड', mr: 'डार्क मोड' },
  footer: {
    en: 'Works offline · No sign-up · No tracking',
    hi: 'बिना इंटरनेट चलता है · कोई साइन-अप नहीं · कोई ट्रैकिंग नहीं',
    mr: 'इंटरनेटशिवाय चालते · साइन-अप नाही · ट्रॅकिंग नाही',
  },
} satisfies Record<string, T>;

export const VERDICT: Record<Verdict, { title: T; sub: T; todo: T }> = {
  safe: {
    title: { en: 'Looks safe', hi: 'सुरक्षित लगता है', mr: 'सुरक्षित वाटतो' },
    sub: { en: 'No common scam signs found.', hi: 'ठगी के आम संकेत नहीं मिले।', mr: 'फसवणुकीची नेहमीची लक्षणे आढळली नाहीत.' },
    todo: {
      en: 'Nothing to do. Still, never share your OTP, PIN or passwords with anyone.',
      hi: 'कुछ करने की ज़रूरत नहीं। फिर भी अपना OTP, PIN या पासवर्ड कभी किसी को न बताएँ।',
      mr: 'काही करायची गरज नाही. तरीही तुमचा OTP, PIN किंवा पासवर्ड कधीही कोणालाही सांगू नका.',
    },
  },
  suspicious: {
    title: { en: 'Suspicious', hi: 'संदिग्ध', mr: 'संशयास्पद' },
    sub: { en: 'Some warning signs. Be careful.', hi: 'कुछ चेतावनी के संकेत हैं। सावधान रहें।', mr: 'काही धोक्याची लक्षणे आहेत. सावध रहा.' },
    todo: {
      en: 'Do not click links or share any code. Check with the company directly, using the number printed on your card or their official app.',
      hi: 'लिंक न खोलें और कोई कोड न बताएँ। कंपनी से सीधे पूछें, अपने कार्ड पर छपे नंबर या उनके आधिकारिक ऐप से।',
      mr: 'लिंक उघडू नका आणि कोणताही कोड सांगू नका. कंपनीकडे थेट खात्री करा, तुमच्या कार्डवर छापलेल्या नंबरवरून किंवा अधिकृत ॲपमधून.',
    },
  },
  scam: {
    title: { en: 'Likely scam', hi: 'शायद धोखाधड़ी', mr: 'बहुधा फसवणूक' },
    sub: { en: 'Many warning signs. Do not reply.', hi: 'कई चेतावनी संकेत हैं। जवाब न दें।', mr: 'अनेक धोक्याची लक्षणे आहेत. उत्तर देऊ नका.' },
    todo: {
      en: 'Do not click the link, call the number or share your OTP. If you are worried, call the number printed on your card.',
      hi: 'लिंक न खोलें, नंबर पर कॉल न करें, OTP न बताएँ। चिंता हो तो अपने कार्ड पर छपे नंबर पर कॉल करें।',
      mr: 'लिंक उघडू नका, नंबरवर कॉल करू नका, OTP सांगू नका. काळजी वाटत असेल तर तुमच्या कार्डवर छापलेल्या नंबरवर कॉल करा.',
    },
  },
};

export const LOST_MONEY: T = {
  en: 'Lost money? Call 1930 (National Cyber Crime Helpline, India) or report at cybercrime.gov.in.',
  hi: 'पैसे गए? 1930 (राष्ट्रीय साइबर क्राइम हेल्पलाइन) पर कॉल करें या cybercrime.gov.in पर शिकायत करें।',
  mr: 'पैसे गेले? 1930 (राष्ट्रीय सायबर गुन्हे हेल्पलाइन) वर कॉल करा किंवा cybercrime.gov.in वर तक्रार करा.',
};

const REASONS: Record<string, T> = {
  secret_request: {
    en: 'It asks for your OTP, PIN, CVV or password. Banks and companies never ask for these.',
    hi: 'यह आपका OTP, PIN, CVV या पासवर्ड माँग रहा है। बैंक और कंपनियाँ ये कभी नहीं माँगतीं।',
    mr: 'हा मेसेज तुमचा OTP, PIN, CVV किंवा पासवर्ड मागत आहे. बँका आणि कंपन्या हे कधीच मागत नाहीत.',
  },
  pin_to_receive: {
    en: 'It asks you to enter a PIN or scan a QR code to receive money. You never need a PIN to receive money.',
    hi: 'यह पैसे पाने के लिए PIN डालने या QR कोड स्कैन करने को कह रहा है। पैसे पाने के लिए कभी PIN नहीं लगता।',
    mr: 'पैसे मिळवण्यासाठी PIN टाकायला किंवा QR कोड स्कॅन करायला सांगत आहे. पैसे मिळवण्यासाठी कधीही PIN लागत नाही.',
  },
  remote_app: {
    en: 'It asks you to install a screen-sharing app such as AnyDesk. That lets a stranger control your phone.',
    hi: 'यह AnyDesk जैसा स्क्रीन शेयर करने वाला ऐप डालने को कह रहा है। इससे कोई अजनबी आपका फ़ोन चला सकता है।',
    mr: 'AnyDesk सारखे स्क्रीन शेअर करणारे ॲप टाकायला सांगत आहे. त्यामुळे अनोळखी व्यक्ती तुमचा फोन चालवू शकते.',
  },
  lookalike_link: {
    en: 'The link goes to {host}, which is not the real {brand} website.',
    hi: 'लिंक {host} पर जाता है, जो असली {brand} की वेबसाइट नहीं है।',
    mr: 'लिंक {host} वर जाते, जी खरी {brand} वेबसाइट नाही.',
  },
  lookalike_link_nobrand: {
    en: 'The link goes to {host}, an address made to look like a real one.',
    hi: 'लिंक {host} पर जाता है, जो असली जैसा दिखने वाला नकली पता है।',
    mr: 'लिंक {host} वर जाते, हा खऱ्यासारखा दिसणारा बनावट पत्ता आहे.',
  },
  ip_link: {
    en: 'The link is only a number address ({host}), not a proper website name.',
    hi: 'लिंक सिर्फ़ नंबरों वाला पता ({host}) है, कोई सही वेबसाइट नाम नहीं।',
    mr: 'लिंक फक्त आकड्यांचा पत्ता ({host}) आहे, योग्य वेबसाइटचे नाव नाही.',
  },
  short_link: {
    en: 'The link is shortened ({host}), so you cannot see where it really goes.',
    hi: 'लिंक छोटा किया गया है ({host}), इसलिए पता नहीं चलता कि यह असल में कहाँ ले जाएगा।',
    mr: 'लिंक लहान केलेली आहे ({host}), त्यामुळे ती खरोखर कुठे नेते ते कळत नाही.',
  },
  odd_tld: {
    en: 'The link goes to {host}, an unusual web address often used in scams.',
    hi: 'लिंक {host} पर जाता है, ऐसा अजीब पता जो अक्सर ठगी में इस्तेमाल होता है।',
    mr: 'लिंक {host} वर जाते, असा विचित्र पत्ता जो अनेकदा फसवणुकीत वापरला जातो.',
  },
  chat_link: {
    en: 'It tries to move you to a WhatsApp or Telegram chat.',
    hi: 'यह आपको WhatsApp या Telegram चैट पर ले जाना चाहता है।',
    mr: 'तुम्हाला WhatsApp किंवा Telegram चॅटवर नेण्याचा प्रयत्न करत आहे.',
  },
  unknown_link: {
    en: 'It contains a link. Only open links you were expecting.',
    hi: 'इसमें एक लिंक है। सिर्फ़ वही लिंक खोलें जिसकी आपको उम्मीद थी।',
    mr: 'यात एक लिंक आहे. तुम्हाला अपेक्षित असलेलीच लिंक उघडा.',
  },
  threat: {
    en: 'It threatens you: your account, service or connection will be blocked or cut.',
    hi: 'यह डरा रहा है कि आपका खाता, सेवा या कनेक्शन बंद या ब्लॉक हो जाएगा।',
    mr: 'तुमचे खाते, सेवा किंवा कनेक्शन बंद किंवा ब्लॉक होईल अशी भीती दाखवत आहे.',
  },
  urgency: {
    en: 'It rushes you to act now. Scammers create panic so you do not stop to think.',
    hi: 'यह तुरंत कुछ करने का दबाव डाल रहा है। ठग घबराहट पैदा करते हैं ताकि आप सोच न सकें।',
    mr: 'लगेच काहीतरी करायची घाई करत आहे. फसवणूक करणारे घबराट निर्माण करतात म्हणजे तुम्ही विचार करू नये.',
  },
  fee_request: {
    en: 'It asks you to pay a fee or send money.',
    hi: 'यह फ़ीस भरने या पैसे भेजने को कह रहा है।',
    mr: 'शुल्क भरायला किंवा पैसे पाठवायला सांगत आहे.',
  },
  prize: {
    en: 'It says you won a prize or lottery that you never entered.',
    hi: 'यह कहता है कि आपने कोई इनाम या लॉटरी जीती है, जिसमें आपने कभी हिस्सा नहीं लिया।',
    mr: 'तुम्ही कधी भाग न घेतलेले बक्षीस किंवा लॉटरी जिंकल्याचे सांगत आहे.',
  },
  kyc: {
    en: 'It asks you to update KYC, PAN or Aadhaar from a message. Banks ask you to do this in the branch or their official app.',
    hi: 'यह मैसेज से KYC, PAN या आधार अपडेट करने को कह रहा है। बैंक यह शाखा या अपने आधिकारिक ऐप में करवाते हैं।',
    mr: 'मेसेजवरून KYC, PAN किंवा आधार अपडेट करायला सांगत आहे. बँका हे शाखेत किंवा अधिकृत ॲपमध्ये करायला सांगतात.',
  },
  job_fee: {
    en: 'It offers a job but asks you to pay first. Real employers do not charge you to work.',
    hi: 'यह नौकरी दे रहा है पर पहले पैसे माँग रहा है। असली कंपनियाँ काम देने के पैसे नहीं लेतीं।',
    mr: 'नोकरी देतो म्हणतो पण आधी पैसे मागतो. खरे मालक काम देण्यासाठी पैसे घेत नाहीत.',
  },
  easy_money: {
    en: 'It promises a lot of money for very little work.',
    hi: 'यह बहुत कम काम के बदले बहुत ज़्यादा कमाई का वादा कर रहा है।',
    mr: 'थोड्या कामासाठी खूप जास्त कमाईचे आमिष दाखवत आहे.',
  },
  invest: {
    en: 'It promises guaranteed or doubled returns. Real investments never guarantee that.',
    hi: 'यह पक्के या दोगुने मुनाफ़े का वादा कर रहा है। असली निवेश में ऐसी गारंटी नहीं होती।',
    mr: 'हमखास किंवा दुप्पट नफ्याचे वचन देत आहे. खऱ्या गुंतवणुकीत अशी हमी नसते.',
  },
  bill_cut: {
    en: 'It says your electricity or gas will be cut and gives a number or link. Real companies do not do this by text message.',
    hi: 'यह कहता है कि बिजली या गैस काट दी जाएगी और कोई नंबर या लिंक देता है। असली कंपनियाँ ऐसा मैसेज से नहीं करतीं।',
    mr: 'वीज किंवा गॅस कापला जाईल असे सांगून नंबर किंवा लिंक देतो. खऱ्या कंपन्या असे मेसेजवरून करत नाहीत.',
  },
  parcel_fee: {
    en: 'It says a parcel is stuck and asks for a fee.',
    hi: 'यह कहता है कि पार्सल रुका है और शुल्क माँग रहा है।',
    mr: 'पार्सल अडकले आहे असे सांगून शुल्क मागत आहे.',
  },
  parcel_held: {
    en: 'It says a parcel could not be delivered and asks you to act.',
    hi: 'यह कहता है कि पार्सल नहीं पहुँचा और आपसे कुछ करने को कह रहा है।',
    mr: 'पार्सल पोहोचले नाही असे सांगून काहीतरी करायला सांगत आहे.',
  },
  callback: {
    en: 'It asks you to call or WhatsApp a number given in the message.',
    hi: 'यह मैसेज में दिए गए नंबर पर कॉल या WhatsApp करने को कह रहा है।',
    mr: 'मेसेजमधील नंबरवर कॉल किंवा WhatsApp करायला सांगत आहे.',
  },
  premium_sms: {
    en: 'It asks you to text a word to a short number. Such messages can cost money or sign you up to paid services.',
    hi: 'यह किसी छोटे नंबर पर कोई शब्द SMS करने को कहता है। ऐसे मैसेज से पैसे कट सकते हैं या पेड सेवा शुरू हो सकती है।',
    mr: 'हा एखाद्या छोट्या नंबरवर शब्द SMS करायला सांगतो. अशा मेसेजमुळे पैसे कापले जाऊ शकतात किंवा पेड सेवा सुरू होऊ शकते.',
  },
  impersonation: {
    en: 'It claims to be from {brand}, but wants you to use its own link or number.',
    hi: 'यह खुद को {brand} की ओर से बताता है, पर अपना ही लिंक या नंबर इस्तेमाल करवाना चाहता है।',
    mr: 'हा स्वतःला {brand} कडून असल्याचे सांगतो, पण स्वतःचीच लिंक किंवा नंबर वापरायला लावतो.',
  },
  generic_greeting: {
    en: 'It starts with a general greeting like “Dear Customer” instead of your name.',
    hi: 'यह आपके नाम की जगह “प्रिय ग्राहक” जैसे आम शब्दों से शुरू होता है।',
    mr: 'तुमच्या नावाऐवजी “प्रिय ग्राहक” सारख्या सामान्य शब्दांनी सुरू होतो.',
  },
  shouting: {
    en: 'It uses lots of CAPITAL letters or !!! to grab your attention.',
    hi: 'इसमें ध्यान खींचने के लिए बहुत सारे बड़े अक्षर या !!! हैं।',
    mr: 'लक्ष वेधण्यासाठी खूप मोठी अक्षरे किंवा !!! वापरली आहेत.',
  },
  misspell: {
    en: 'It has spelling mistakes that real companies rarely make.',
    hi: 'इसमें स्पेलिंग की ऐसी गलतियाँ हैं जो असली कंपनियाँ कम ही करती हैं।',
    mr: 'खऱ्या कंपन्या क्वचितच करतात अशा स्पेलिंगच्या चुका आहेत.',
  },
  homoglyph: {
    en: 'Some letters are look-alike letters from another alphabet, used to trick you.',
    hi: 'कुछ अक्षर दूसरी लिपि के मिलते-जुलते अक्षर हैं, धोखा देने के लिए।',
    mr: 'काही अक्षरे दुसऱ्या लिपीतील सारखी दिसणारी अक्षरे आहेत, फसवण्यासाठी.',
  },
  ml_high: {
    en: 'The wording is very close to known scam and spam messages.',
    hi: 'इसके शब्द जाने-पहचाने ठगी और स्पैम मैसेज से बहुत मिलते हैं।',
    mr: 'याचे शब्द माहीत असलेल्या फसवणुकीच्या आणि स्पॅम मेसेजशी खूप जुळतात.',
  },
  ml_mid: {
    en: 'Some of the wording is similar to known spam messages.',
    hi: 'इसके कुछ शब्द जाने-पहचाने स्पैम मैसेज से मिलते हैं।',
    mr: 'याचे काही शब्द माहीत असलेल्या स्पॅम मेसेजशी जुळतात.',
  },
  bank_alert: {
    en: 'It reads like a normal bank alert: it reports money on your own account or card and asks you for nothing.',
    hi: 'यह सामान्य बैंक अलर्ट जैसा है: यह आपके अपने खाते या कार्ड के लेन-देन की जानकारी देता है और आपसे कुछ नहीं माँगता।',
    mr: 'हा नेहमीच्या बँक सूचनेसारखा आहे: तुमच्या स्वतःच्या खात्यातील किंवा कार्डवरील व्यवहाराची माहिती देतो आणि तुमच्याकडून काहीही मागत नाही.',
  },
  otp_notice: {
    en: 'It tells you not to share your code, as real bank messages do.',
    hi: 'यह कहता है कि अपना कोड किसी को न बताएँ, जैसा असली बैंक मैसेज कहते हैं।',
    mr: 'हा मेसेज तुमचा कोड कोणालाही सांगू नका असे सांगतो, जसे खरे बँक मेसेज सांगतात.',
  },
  official_link: {
    en: 'The link goes to the official {brand} website.',
    hi: 'लिंक {brand} की आधिकारिक वेबसाइट पर जाता है।',
    mr: 'लिंक {brand} च्या अधिकृत वेबसाइटवर जाते.',
  },
  no_asks: {
    en: 'It does not ask for money or codes, and does not ask you to open a link or call a number.',
    hi: 'यह पैसे या कोड नहीं माँगता, और न ही लिंक खोलने या किसी नंबर पर कॉल करने को कहता है।',
    mr: 'हा पैसे किंवा कोड मागत नाही, आणि लिंक उघडायला किंवा नंबरवर कॉल करायलाही सांगत नाही.',
  },
  ml_low: {
    en: 'The wording does not look like typical scam or spam messages.',
    hi: 'इसके शब्द आम ठगी या स्पैम मैसेज जैसे नहीं लगते।',
    mr: 'याचे शब्द नेहमीच्या फसवणुकीच्या किंवा स्पॅम मेसेजसारखे वाटत नाहीत.',
  },
};

const GENERIC_BRANDS: Record<string, T> = {
  bank: { en: 'a bank', hi: 'बैंक', mr: 'बँके' },
  electricity: { en: 'the electricity company', hi: 'बिजली कंपनी', mr: 'वीज कंपनी' },
  'bank.in': { en: 'a registered Indian bank (.bank.in)', hi: 'पंजीकृत भारतीय बैंक (.bank.in)', mr: 'नोंदणीकृत भारतीय बँक (.bank.in)' },
};

export function reasonText(r: Reason, lang: Lang): string {
  const id = r.id === 'lookalike_link' && (!r.brand || r.brand === 'bank') ? 'lookalike_link_nobrand' : r.id;
  const brand = r.brand ? (GENERIC_BRANDS[r.brand]?.[lang] ?? r.brand) : '';
  return (REASONS[id]?.[lang] ?? id).replace('{brand}', brand).replace('{host}', r.host ?? '');
}

export const EXAMPLES: { label: T; text: string }[] = [
  {
    label: { en: 'Bank KYC alert', hi: 'बैंक KYC अलर्ट', mr: 'बँक KYC सूचना' },
    text: 'Dear Customer, your SBI account will be BLOCKED today as your KYC is not updated. Update your PAN immediately at http://sbi-secure-kyc.xyz/login to avoid suspension.',
  },
  {
    label: { en: 'OTP request (Hindi)', hi: 'OTP माँगना', mr: 'OTP मागणी (हिंदी)' },
    text: 'नमस्ते, मैं बैंक से बोल रहा हूँ। गलती से आपके नंबर पर एक ओटीपी चला गया है, कृपया वह ओटीपी इस नंबर पर भेज दें 98765 43210 ताकि ट्रांजैक्शन रद्द हो सके।',
  },
  {
    label: { en: 'Job offer (Hinglish)', hi: 'नौकरी का ऑफ़र (हिंग्लिश)', mr: 'नोकरीची ऑफर (हिंग्लिश)' },
    text: 'Congratulations! Aapko Amazon me part time job mili hai. Roz 2000-5000 kamao ghar baithe. Joining ke liye sirf Rs 999 registration fee pay karo: wa.me/919876543210',
  },
  {
    label: { en: 'Electricity bill (Marathi)', hi: 'बिजली बिल (मराठी)', mr: 'वीज बिल' },
    text: 'महावितरण सूचना: तुमचे वीज बिल भरलेले दिसत नाही. आज रात्री तुमचा वीज पुरवठा बंद केला जाईल. ताबडतोब आमच्या अधिकाऱ्याशी संपर्क साधा 98765 43210',
  },
  {
    label: { en: 'Parcel update', hi: 'पार्सल अपडेट', mr: 'पार्सल अपडेट' },
    text: 'Your parcel delivery failed because the address was incomplete. Please update your details here: tinyurl.com/parcel-update-in',
  },
  {
    label: { en: 'Real bank OTP', hi: 'असली बैंक OTP', mr: 'खरा बँक OTP' },
    text: '374519 is your OTP for a payment of Rs 1,499.00 at Swiggy on your HDFC Bank card ending 4521. Valid for 10 minutes. Do not share this OTP with anyone.',
  },
];
