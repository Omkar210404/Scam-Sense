// ScamSense engine: explainable rules + a small TF-IDF / logistic regression model, combined into
// a verdict. Pure functions, no network, no storage. Runs in the browser and in Node (npm run eval).

export type Verdict = 'safe' | 'suspicious' | 'scam';
export type Lang = 'en' | 'hi' | 'mr';
export type Severity = 'danger' | 'warn' | 'link';
export type Tone = 'bad' | 'good' | 'info';

export interface Span { start: number; end: number; severity: Severity }
export interface Reason { id: string; tone: Tone; brand?: string; host?: string }
export interface Result {
  verdict: Verdict;
  risk: number;
  ml: number;
  reasons: Reason[];
  spans: Span[];
  detectedLang: Lang | null;
}

interface Block { terms: string[]; idf: number[]; coef: number[] }
export interface Model { word: Block; char: Block; bias: number }

// ------------------------------------------------------------------ classifier
// Mirrors normalize / tokens / word_features / char_features in train.py exactly.

const TLDS = 'com|in|net|org|co|info|xyz|top|club|online|site|me|ly|gl|io|vip|link|click|live|shop|ws|tk|ml|ga|cf|gq|icu|buzz|cfd|sbs|biz|cc|uk|gov|app|store|win|loan';
const N_URL = new RegExp(String.raw`(?:https?://|www\.)[^\s]+|(?<![a-z0-9.@-])[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:${TLDS})(?![a-z0-9])(?:/[^\s]*)?`, 'g');
const N_PHONE = /(?<![0-9])\+?[0-9](?:[ -]?[0-9]){9,12}(?![0-9])/g;
const N_MONEY = /(?:₹|rs\.?|inr|£|\$|€) ?[0-9][0-9,.]*/g;
const N_NUM = /[0-9]+(?:[.,:][0-9]+)*/g;
const WORD_CHAR = /[\p{L}\p{M}\p{N}]/u;

const devToAscii = (t: string) => t.replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x966));

function normalize(text: string): string {
  return devToAscii(text.toLowerCase())
    .replace(N_URL, ' xurlx ')
    .replace(N_PHONE, ' xphonex ')
    .replace(N_MONEY, ' xmoneyx ')
    .replace(N_NUM, ' xnumx ');
}

function tokens(t: string): string[][] {
  const out: string[][] = [];
  let cur: string[] = [];
  for (const ch of t) {
    if (WORD_CHAR.test(ch)) cur.push(ch);
    else if (cur.length) { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  return out;
}

function features(text: string): { word: string[]; char: string[] } {
  const toks = tokens(normalize(text));
  const words = toks.filter((w) => w.length >= 2).map((w) => w.join(''));
  const word = [...words];
  for (let i = 0; i + 1 < words.length; i++) word.push(words[i] + ' ' + words[i + 1]);
  const char: string[] = [];
  for (const t of toks) {
    const w = [' ', ...t, ' '];
    for (const n of [2, 3, 4]) {
      for (let i = 0; i < Math.max(1, w.length - n + 1); i++) {
        const g = w.slice(i, i + n);
        if (g.length === n) char.push(g.join(''));
      }
    }
  }
  return { word, char };
}

type Index = { map: Map<string, number>; block: Block };
const indexCache = new WeakMap<Model, [Index, Index]>();

function blockScore(feats: string[], ix: Index): number {
  const counts = new Map<number, number>();
  for (const f of feats) {
    const i = ix.map.get(f);
    if (i !== undefined) counts.set(i, (counts.get(i) ?? 0) + 1);
  }
  let norm = 0, dot = 0;
  for (const [i, c] of counts) {
    const v = (1 + Math.log(c)) * ix.block.idf[i];
    norm += v * v;
    dot += v * ix.block.coef[i];
  }
  return norm > 0 ? dot / Math.sqrt(norm) : 0;
}

export function mlProbability(model: Model, text: string): number {
  let ix = indexCache.get(model);
  if (!ix) {
    const mk = (b: Block): Index => ({ map: new Map(b.terms.map((t, i) => [t, i])), block: b });
    ix = [mk(model.word), mk(model.char)];
    indexCache.set(model, ix);
  }
  const f = features(text);
  const z = model.bias + blockScore(f.word, ix[0]) + blockScore(f.char, ix[1]);
  return 1 / (1 + Math.exp(-z));
}

// ------------------------------------------------------------------ rule helpers

type Hit = { start: number; end: number };

/** English/Hinglish alternatives get word boundaries; Devanagari ones match as substrings. */
function re(en: string[], dev: string[] = []): RegExp {
  const parts: string[] = [];
  if (en.length) parts.push(String.raw`\b(?:${en.join('|')})\b`);
  if (dev.length) parts.push(`(?:${dev.join('|')})`);
  return new RegExp(parts.join('|'), 'giu');
}

function find(r: RegExp, text: string): Hit[] {
  const out: Hit[] = [];
  for (const m of text.matchAll(r)) if (m[0].length) out.push({ start: m.index, end: m.index + m[0].length });
  return out;
}

const within = (h: Hit, outer: Hit[]) => outer.some((o) => h.start >= o.start && h.end <= o.end);

// ------------------------------------------------------------------ patterns

const SECRET = re(
  ['otp', 'one[- ]time password', 'o\\.t\\.p', 'pin(?![- ]?code)', 'm-?pin', 'upi pin', 'atm pin', 'cvv', 'cvc', 'card number', 'card details'],
  ['ओटीपी', 'पिन', 'सीवीवी', 'कार्ड नंबर', 'कार्ड की जानकारी', 'कार्डचा नंबर'],
);
const PASSWORD = re(['password', 'passcode', 'net ?banking password'], ['पासवर्ड']);
const SHARE_VERB = re(
  ['share', 'send', 'tell', 'provide', 'give', 'reply', 'forward', 'read out', 'disclose',
    'bata(?:o|iye|ye|yen|na| do| dijiye| dena)?', 'bhej(?:o| do| dein| dijiye|na)?', 'share kar\\w*'],
  ['बताएं', 'बताइए', 'बताओ', 'बता दें', 'बता दीजिए', 'भेजें', 'भेज दें', 'भेजो', 'भेज दीजिए', 'शेयर कर', 'साझा कर', 'सांगा', 'सांग', 'पाठवा', 'शेअर करा', 'कळवा', 'द्या'],
);
const NEGATION = re(
  ["(?:do not|don't|dont|never|not to|pls don't|please do not|please don't) (?:share|disclose|tell|give|reveal)\\w*",
    'will never ask\\w*', 'never ask\\w*', 'share na kar\\w*', 'share mat kar\\w*', 'kisi ko na bata\\w*', 'kisi ko mat bata\\w*', 'na bataye\\w*'],
  ['(?:साझा|शेयर) न करें', 'किसी को (?:न|ना|मत) बता\\S*', 'किसी के साथ साझा न करें', 'कोणालाही सांगू नका', 'कोणालाही देऊ नका', 'शेअर करू नका', 'सांगू नका'],
);
const PIN_OR_QR = re(['(?:upi )?pin(?![- ]?code)', 'm-?pin', 'scan (?:the |this |our )?qr(?: code)?', 'qr (?:code )?scan\\w*'], ['पिन', 'क्यूआर']);
const RECEIVE = re(
  ['receive\\w*', 'get (?:the |your )?money', 'refund\\w*', 'cashback', 'reward', 'aa jayega', 'mil jayega', 'milega'],
  ['प्राप्त', 'पाने के लिए', 'मिलेगा', 'मिल जाएगा', 'मिळवण्यासाठी', 'मिळेल', 'परतावा'],
);
const REMOTE_APP = re(['any ?desk', 'team ?viewer', 'quick ?support', 'rust ?desk', 'airdroid', 'screen ?shar\\w*', 'apk'], ['एनीडेस्क', 'स्क्रीन शेयर', 'स्क्रीन शेअर']);
const THREAT = re(
  ['block(?:ed)?', 'suspend(?:ed)?', 'suspension', 'deactivat\\w*', 'disconnect\\w*', 'terminat\\w*', 'frozen', 'freeze', 'locked',
    'legal action', 'arrest\\w*', 'police case', 'penalty', 'cut off', 'will be cut', 'band ho jaye?ga', 'band kar di?ya? jaye?ga',
    'band ho jayegi', 'block ho jaye?ga', 'kaat di jayegi', 'kat jaye?g[ai]', 'case ho jaye?ga', 'warna'],
  ['बंद कर दिया जाएगा', 'बंद हो जाएगा', 'बंद होने वाला', 'बंद हो रहा', 'ब्लॉक', 'निलंबित', 'काट दी जाएगी', 'काट दिया जाएगा', 'कानूनी कार्रवाई',
    'गिरफ्तार', 'वरना', 'बंद होईल', 'बंद होणार', 'बंद केला जाईल', 'बंद केले जाईल', 'खंडित', 'कापले जाईल', 'कारवाई', 'अटक', 'नाहीतर'],
);
const URGENCY = re(
  ['urgent(?:ly)?', 'immediate(?:ly)?', 'asap', 'right now', 'act now', 'within [0-9]+ ?(?:hours?|hrs?|minutes?|mins?|days?)',
    'last (?:chance|date|reminder|warning)', 'final (?:notice|warning|reminder)', 'expir(?:es|ing|ed) (?:today|soon|tonight)', 'before it expires',
    'limited (?:time|slots|period|offer)', 'turant', 'jaldi', 'abhi (?:call|click|pay|update|join)'],
  ['तुरंत', 'तत्काल', 'जल्दी', 'अभी (?:कॉल|क्लिक|अपडेट|जुड़ें|व्हाट्सएप)', '24 घंटे', 'लगेच', 'ताबडतोब', 'त्वरित', 'आत्ताच'],
);
const FEE = re(
  ['fees?', 'charges?', '(?<!fixed |term |recurring )deposit', 'processing (?:fee|charge)', 'registration', 'clearance', 'joining (?:fee|amount)', 'membership',
    'advance payment', 'token (?:amount|money)', 'refundable'],
  ['शुल्क', 'फीस', 'डिपॉजिट', 'अनामत', 'रजिस्ट्रेशन', 'नोंदणी', 'प्रोसेसिंग'],
);
const AMOUNT = /(?:₹|\brs\.?|\binr)\s?[0-9][0-9,.]*|[0-9][0-9,]*\s?(?:rupees?|rupay|रुपये|रुपए|रुपयांची|रुपयांचे|रु\.)/giu;
const SEND_MONEY = re(['send', 'transfer', 'bhej(?:o| do| dein)?', 'jama kar\\w*'], ['जमा करें', 'भेजें', 'पाठवा', 'भरा', 'जमा करा']);
const PRIZE = re(
  ['won', 'winner', 'winning', 'lottery', 'lucky draw', 'lucky winner', 'jackpot', 'prize', 'claim', 'kbc', 'jeet[aei]?', 'inaam', 'inam', 'bumper'],
  ['लॉटरी', 'इनाम', 'जीती', 'जीता', 'लकी ड्रा', 'बक्षीस', 'जिंकली', 'जिंकला', 'लकी ड्रॉ', 'करोड़पति'],
);
const KYC = re(['kyc', 're-?kyc', 'pan card', 'pan update', 'aadhaa?r'], ['केवाईसी', 'पैन कार्ड', 'पॅन कार्ड', 'आधार']);
const JOB = re(
  ['jobs?', 'work from home', 'wfh', 'part[- ]time', 'hiring', 'vacanc(?:y|ies)', 'salary', 'data entry', 'ghar baithe', 'naukri', 'selection', 'selected'],
  ['नौकरी', 'घर बैठे', 'घरबसल्या', 'नोकरी', 'भर्ती', 'चयन', 'निवड'],
);
const EASY_MONEY = re(
  ['earn (?:rs\\.? ?|₹ ?)?[0-9][0-9,]*(?:\\s?(?:-|to)\\s?[0-9][0-9,]*)? ?(?:daily|per day|a day|/day|per hour|per week)', 'roz [0-9][0-9,]* kama\\w*', '[0-9][0-9,]* (?:per|a) day'],
  ['रोज़? [0-9][0-9,]* रुपये कमा\\S*', 'दररोज [0-9][0-9,]* रुपये कमवा'],
);
const INVEST = re(
  ['double your money', 'money double', 'paisa double', 'double karo', 'guaranteed (?:returns?|profit|income)', '(?:returns?|profit) guaranteed',
    '[0-9]+ ?% (?:daily|weekly|monthly|profit|returns?)', 'risk[- ]free', 'zero risk', 'no risk', '100% guarantee'],
  ['पैसा डबल', 'पैसे डबल', 'दुप्पट', 'गारंटी के साथ', 'हमखास', 'कोई जोखिम नहीं', 'कोणताही धोका नाही', 'रोज़? [0-9]+% ', 'दररोज [0-9]+%'],
);
const UTILITY = re(['electricity', 'power supply', 'power', 'light bill', 'bijli', 'light', 'gas connection', 'mseb', 'mahavitaran', 'bses', 'meter'], ['बिजली', 'वीज', 'गैस', 'महावितरण', 'मीटर']);
const CUT = re(['disconnect\\w*', 'cut(?: off)?', 'kaat\\w*', 'kat jaye?g[ai]', 'band (?:ho|kar)'], ['काट', 'कट जाए', 'बंद कर', 'बंद हो', 'खंडित', 'कापले', 'बंद केला']);
const PARCEL = re(
  ['parcel', 'courier', 'package', 'shipment', 'consignment', 'delivery', 'customs', 'india post', 'speed post', 'fedex', 'dhl', 'blue ?dart', 'dtdc', 'delhivery'],
  ['पार्सल', 'कूरियर', 'कुरियर', 'कुरिअर', 'कस्टम', 'इंडिया पोस्ट', 'डिलीवरी'],
);
const HELD = re(
  ['on hold', 'held', "(?:could not|couldn't|cannot|can't) be delivered", 'delivery (?:failed|attempt failed)', 'failed', 'incomplete address',
    'address (?:is )?incomplete', 'update (?:your )?(?:address|details)', 'redeliver\\w*', 'reschedule', 'ruka', 'pakda'],
  ['रुका', 'रोका', 'अडकले', 'थांबवले', 'पता अपडेट', 'पत्ता अपडेट'],
);
const PHONE = /(?<![0-9])(?:\+91[ -]?|0)?[6-9][0-9]{4}[ -]?[0-9]{5}(?![0-9])|(?<![0-9])\+?[0-9](?:[ -]?[0-9]){9,12}(?![0-9])/g;
const CALL = re(
  ['call(?! me\\b)\\w*', 'contact', 'whats ?app', 'helpline', 'customer care', 'care number', 'reach us', 'dial', 'ring', 'phone kar\\w*', 'sms'],
  ['कॉल', 'संपर्क', 'व्हाट्सएप', 'फोन करें', 'ग्राहक सेवा', 'हेल्पलाइन', 'व्हॉट्सॲप', 'क्रमांक', 'फोन करा'],
);
const BRANDS: [string, RegExp][] = [
  ['SBI', /\bsbi\b|स्टेट बैंक/giu], ['HDFC Bank', /\bhdfc\b/giu], ['ICICI Bank', /\bicici\b/giu], ['Axis Bank', /\baxis bank\b/giu],
  ['Kotak', /\bkotak\b/giu], ['Paytm', /\bpaytm\b|पेटीएम/giu], ['PhonePe', /\bphonepe\b|फोनपे/giu], ['Google Pay', /\bgoogle pay\b|\bgpay\b/giu],
  ['Amazon', /\bamazon\b/giu], ['Flipkart', /\bflipkart\b/giu], ['India Post', /\bindia ?post\b|इंडिया पोस्ट/giu], ['FedEx', /\bfedex\b/giu],
  ['DHL', /\bdhl\b/giu], ['Blue Dart', /\bblue ?dart\b/giu], ['Netflix', /\bnetflix\b/giu], ['Airtel', /\bairtel\b/giu], ['Jio', /\bjio\b/giu],
  ['Income Tax', /\bincome tax\b|आयकर/giu], ['RBI', /\brbi\b|रिज़र्व बैंक/giu], ['UIDAI', /\buidai\b/giu], ['Police', /\bpolice\b|पुलिस/giu],
  ['Customs', /\bcustoms\b|कस्टम/giu], ['EPFO', /\bepfo\b|ईपीएफओ/giu], ['LIC', /\blic\b|एलआईसी/giu], ['MSEB', /\bmseb\b|\bmahavitaran\b|महावितरण/giu],
  ['bank', /\bbank\b|बैंक|बँक/giu], ['electricity', /\belectricity\b|बिजली|वीज/giu],
];
const SHORT_CODE = /\b(?:text|txt|send|sms|reply)\b[^.\n]{0,25}?\bto:?\s?[0-9]{4,6}\b(?![0-9])/giu;
const SMS_BLOCK =/\bsms\s+block\b[^.\n]{0,30}?\bto\s+\+?[0-9][0-9 -]{8,14}[0-9]/giu;
const REF_NUMBER = /(?:\bref(?:erence)?(?:\s?no\.?)?|\brefno|\butr|\brrn|\btxn(?:\s?id)?|\bupi\/(?:cr|dr)|reference number(?: is)?)[\s:#./-]*[0-9]{6,}/giu;
const ALERT_EVENT = re(
  ['debited', 'credited', 'spent', 'withdrawn', 'sent rs\\.?', 'avl\\.? bal', 'avbl\\.? bal', 'available balance', 'avl\\.? lmt', 'available limit',
    'statement', 'total (?:amount )?due', 'minimum due', 'due date', 'emi', 'cleared', 'will mature', 'matured', 'is due on', 'auto-?debit', 'mandate'],
  ['डेबिट', 'क्रेडिट', 'जमा किए गए', 'जमा हो गई', 'शेष', 'वजा झाले', 'वजा झाला', 'जमा झाला', 'जमा झाले', 'शिल्लक', 'उपलब्ध'],
);
const MASKED_ACCOUNT = /(?:a\/c|acct|account|card|खाते|खाता)[^.\n]{0,25}?(?:x+|\*+) ?[0-9]{2,6}|ending (?:with )?[0-9]{4}|\b[x*]{2,}[0-9]{3,6}\b/giu;
const GREETING = re(['dear (?:customer|user|consumer|member|valued customer|sir/madam|account ?holder|card ?holder)'], ['प्रिय ग्राहक', 'प्रिय उपभोक्ता', 'प्रिय खातेदार']);
const MISSPELL = re(['acount', 'accout', 'custmer', 'costumer', 'verfy', 'verifiy', 'recieve', 'recieved', 'immediatly', 'imediately', 'suspened', 'blocket', 'kindly verfiy']);
const HOMOGLYPH = /\p{L}*(?:[a-z][Ͱ-ϿЀ-ӿ]|[Ͱ-ϿЀ-ӿ][a-z])\p{L}*/giu;
const ACRONYMS = new Set(['OTP', 'KYC', 'SBI', 'UPI', 'ATM', 'PAN', 'HDFC', 'ICICI', 'SMS', 'PNR', 'EMI', 'GST', 'NEFT', 'IMPS', 'RTGS', 'CVV', 'PIN', 'MPIN', 'MSEB', 'RBI', 'UIDAI', 'BSES', 'INR', 'DHL', 'DTDC', 'IST', 'AM', 'PM', 'OK', 'NRI']);

// ------------------------------------------------------------------ links

const URL_FIND = new RegExp(String.raw`(?:https?://|www\.)[^\s<>"']+|(?<![\p{L}\p{N}.@-])[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:${TLDS})(?![a-z0-9])(?:/[^\s<>"']*)?`, 'giu');
const SHORTENERS = new Set(['bit.ly', 'bitly.com', 'tinyurl.com', 'goo.gl', 't.co', 'is.gd', 'cutt.ly', 'rb.gy', 'shorturl.at', 'ow.ly', 'tiny.cc', 'rebrand.ly', 's.id', 't.ly', 'v.gd', 'shorte.st', 'adf.ly', 'bl.ink', 'short.io', 'tiny.one', 'u.to', 'qr.ae', 'surl.li', 'clck.ru']);
const CHAT_HOSTS = new Set(['t.me', 'telegram.me', 'wa.me', 'chat.whatsapp.com']);
const ODD_TLDS = new Set(['xyz', 'top', 'club', 'online', 'site', 'icu', 'buzz', 'live', 'click', 'link', 'work', 'shop', 'vip', 'monster', 'rest', 'cfd', 'sbs', 'gq', 'tk', 'ml', 'cf', 'ga', 'loan', 'win', 'bid', 'cyou', 'store', 'info', 'cc', 'ws', 'biz', 'quest', 'lol', 'mom']);
// Official domains: a link is fine for a brand only if its host is (a subdomain of) one of these.
const OFFICIAL: Record<string, string> = {
  'sbi.co.in': 'SBI', 'onlinesbi.sbi': 'SBI', 'sbi': 'SBI', 'hdfcbank.com': 'HDFC Bank', 'icicibank.com': 'ICICI Bank', 'axisbank.com': 'Axis Bank',
  'kotak.com': 'Kotak', 'paytm.com': 'Paytm', 'phonepe.com': 'PhonePe', 'pay.google.com': 'Google Pay', 'amazon.in': 'Amazon', 'amazon.com': 'Amazon',
  'amzn.in': 'Amazon', 'amzn.to': 'Amazon', 'flipkart.com': 'Flipkart', 'fkrt.it': 'Flipkart', 'indiapost.gov.in': 'India Post', 'fedex.com': 'FedEx',
  'dhl.com': 'DHL', 'bluedart.com': 'Blue Dart', 'dtdc.in': 'DTDC', 'dtdc.com': 'DTDC', 'delhivery.com': 'Delhivery', 'netflix.com': 'Netflix',
  'airtel.in': 'Airtel', 'jio.com': 'Jio', 'incometax.gov.in': 'Income Tax', 'rbi.org.in': 'RBI', 'uidai.gov.in': 'UIDAI', 'npci.org.in': 'NPCI',
  'irctc.co.in': 'IRCTC', 'mahadiscom.in': 'MSEB', 'bsesdelhi.com': 'BSES', 'tatapower.com': 'Tata Power', 'adanielectricity.com': 'Adani Electricity',
  'whatsapp.com': 'WhatsApp', 'paypal.com': 'PayPal', 'apple.com': 'Apple', 'icloud.com': 'Apple', 'google.com': 'Google', 'microsoft.com': 'Microsoft',
  'gov.in': 'Government of India', 'nic.in': 'Government of India', 'hdfcbk.io': 'HDFC Bank',
  // RBI's reserved domain: only licensed Indian banks can register under .bank.in.
  'bank.in': 'bank.in',
};
const HOST_BRANDS: [string, string][] = [
  ['onlinesbi', 'SBI'], ['sbi', 'SBI'], ['hdfc', 'HDFC Bank'], ['icici', 'ICICI Bank'], ['axisbank', 'Axis Bank'], ['kotak', 'Kotak'], ['paytm', 'Paytm'],
  ['phonepe', 'PhonePe'], ['gpay', 'Google Pay'], ['googlepay', 'Google Pay'], ['amazon', 'Amazon'], ['amzn', 'Amazon'], ['flipkart', 'Flipkart'],
  ['indiapost', 'India Post'], ['speedpost', 'India Post'], ['fedex', 'FedEx'], ['dhl', 'DHL'], ['bluedart', 'Blue Dart'], ['dtdc', 'DTDC'],
  ['delhivery', 'Delhivery'], ['netflix', 'Netflix'], ['airtel', 'Airtel'], ['jio', 'Jio'], ['incometax', 'Income Tax'], ['rbi', 'RBI'], ['uidai', 'UIDAI'],
  ['aadhaar', 'UIDAI'], ['aadhar', 'UIDAI'], ['npci', 'NPCI'], ['irctc', 'IRCTC'], ['mahadiscom', 'MSEB'], ['mahavitaran', 'MSEB'], ['mseb', 'MSEB'],
  ['bses', 'BSES'], ['tatapower', 'Tata Power'], ['whatsapp', 'WhatsApp'], ['paypal', 'PayPal'], ['apple', 'Apple'], ['icloud', 'Apple'],
];
const LURE_WORDS = /kyc|verify|verification|update|secure|login|signin|account|alert|reward|refund|support|help|redeliver|bank/;

type LinkInfo = Hit & { host: string; kind: 'official' | 'lookalike' | 'ip' | 'short' | 'chat' | 'odd' | 'unknown'; brand?: string };

function deLeet(s: string): string {
  return s.replace(/0/g, 'o').replace(/1/g, 'l').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't').replace(/rn/g, 'm').replace(/vv/g, 'w');
}

function analyzeLink(raw: string, start: number): LinkInfo {
  const trimmed = raw.replace(/[.,;:!?)\]}'"]+$/, '');
  const end = start + trimmed.length;
  const host = trimmed.toLowerCase().replace(/^https?:\/\//, '').split(/[/?#:]/)[0].replace(/^www\./, '');
  const base = { start, end, host };
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return { ...base, kind: 'ip' };
  if (host.includes('xn--')) return { ...base, kind: 'lookalike', brand: '' };
  for (const [domain, brand] of Object.entries(OFFICIAL)) {
    if (host === domain || host.endsWith('.' + domain)) return { ...base, kind: 'official', brand };
  }
  if (SHORTENERS.has(host)) return { ...base, kind: 'short' };
  if (CHAT_HOSTS.has(host)) return { ...base, kind: 'chat' };
  const labels = host.split('.').slice(0, -1).join('.').split(/[.-]/);
  const plain = deLeet(labels.join(''));
  for (const [key, brand] of HOST_BRANDS) {
    const hit = key.length <= 4 ? labels.some((l) => deLeet(l) === key || deLeet(l).startsWith(key) && LURE_WORDS.test(host)) : plain.includes(key);
    if (hit) return { ...base, kind: 'lookalike', brand };
  }
  if (/bank/.test(plain) && LURE_WORDS.test(host.replace('bank', ''))) return { ...base, kind: 'lookalike', brand: 'bank' };
  if (ODD_TLDS.has(host.split('.').pop() ?? '')) return { ...base, kind: 'odd' };
  return { ...base, kind: 'unknown' };
}

// ------------------------------------------------------------------ language

export function detectLang(text: string): Lang | null {
  const dev = (text.match(/[ऀ-ॿ]/g) ?? []).length;
  const latin = (text.match(/[a-z]/gi) ?? []).length;
  if (dev < 4 || dev < latin) return null;
  const count = (r: RegExp) => (text.match(r) ?? []).length;
  const mr = count(/आहे|आहेत|तुमचे|तुमचा|तुमची|तुमच्या|करा|होईल|नाही|झाले|झाला|आणि|लगेच|मध्ये|साठी|पाठवा|सांगा|भरा|बँक|वीज|ॲप|होणार|केले|मी |येईन|येतो|करतो|झाली|उद्या|शुभेच्छा|येशील|पोहोचलो/g);
  const hi = count(/है|हैं|आपका|आपके|आपकी|करें|और|नहीं|जाएगा|लिए|में|बैंक|बिजली|रहा|गया|दें|मैं|हूँ|कल |करना/g);
  return mr > hi ? 'mr' : 'hi';
}

// ------------------------------------------------------------------ analysis

type Signal = { id: string; weight: number; hits: Hit[]; severity: Severity; brand?: string; host?: string };

export function analyze(model: Model, input: string): Result {
  const text = input.normalize('NFC');
  const ml = text.trim() ? mlProbability(model, text) : 0;
  const s: Signal[] = [];
  const add = (id: string, weight: number, hits: Hit[], severity: Severity = 'danger', extra: Partial<Signal> = {}) =>
    s.push({ id, weight, hits, severity, ...extra });
  const f = (r: RegExp) => find(r, text);
  // Parts of genuine bank alerts that would otherwise look like scam signs: "SMS BLOCK 1234 to 9215676766"
  // (the bank's own number, and "block" is not a threat there) and 12-digit UPI/IMPS reference numbers.
  const bankRefs = [...f(SMS_BLOCK), ...f(REF_NUMBER)];

  // Secrets: OTP / PIN / CVV / password requests, ignoring "do not share" phrases.
  const neg = f(NEGATION);
  const verbs = f(SHARE_VERB).filter((h) => !within(h, neg));
  const secrets = f(SECRET).filter((h) => !within(h, neg));
  const passwords = f(PASSWORD).filter((h) => !within(h, neg));
  if (verbs.length && secrets.length) add('secret_request', 0.85, [...secrets, ...verbs]);
  else if (verbs.length && passwords.length) {
    // "Send me the wifi password" from a friend is common; a bank or login password request is not.
    const formal = /bank|account|login|net ?banking|a\/c|बैंक|बँक|खात/i.test(text);
    add('secret_request', formal ? 0.65 : 0.3, [...passwords, ...verbs]);
  }
  const pinQr = f(PIN_OR_QR).filter((h) => !within(h, neg));
  const receive = f(RECEIVE);
  if (pinQr.length && receive.length) add('pin_to_receive', 0.85, [...pinQr, ...receive]);
  const remote = f(REMOTE_APP);
  if (remote.length) add('remote_app', 0.85, remote);

  // Links
  const links = [...text.matchAll(URL_FIND)].map((m) => analyzeLink(m[0], m.index));
  const official = links.filter((l) => l.kind === 'official');
  const risky = links.filter((l) => l.kind !== 'official');
  const firstOf = (k: LinkInfo['kind']) => risky.find((l) => l.kind === k);
  const look = firstOf('lookalike');
  if (look) add('lookalike_link', 0.8, [look], 'danger', { brand: look.brand, host: look.host });
  const ip = firstOf('ip');
  if (ip) add('ip_link', 0.65, [ip], 'danger', { host: ip.host });
  const short = firstOf('short');
  if (short) add('short_link', 0.45, [short], 'link', { host: short.host });
  const odd = firstOf('odd');
  if (odd) add('odd_tld', 0.45, [odd], 'link', { host: odd.host });
  const chat = firstOf('chat');
  if (chat) add('chat_link', 0.3, [chat], 'link', { host: chat.host });
  const unknown = firstOf('unknown');
  if (unknown && !look && !ip && !short && !odd) add('unknown_link', 0.12, [unknown], 'link', { host: unknown.host });

  // Pressure
  const threat = f(THREAT).filter((h) => !within(h, bankRefs));
  if (threat.length) add('threat', 0.35, threat);
  const urgency = f(URGENCY);
  if (urgency.length) add('urgency', 0.25, urgency, 'warn');

  // Phone numbers to call back (toll-free 1800/1860 numbers are left out)
  const phones = [...text.matchAll(PHONE)].map((m) => ({ start: m.index, end: m.index + m[0].length }))
    .filter((h) => !/^1[ -]?8[06]0/.test(text.slice(h.start, h.end).replace(/^\+91[ -]?/, '')) && !within(h, bankRefs));
  const calls = f(CALL);
  const callback = (phones.length && calls.length) || chat?.host === 'wa.me';
  if (callback) add('callback', 0.35, [...phones, ...calls]);
  const shortCode = f(SHORT_CODE).filter((h) => !within(h, bankRefs));
  if (shortCode.length) add('premium_sms', 0.3, shortCode, 'warn');

  // Money
  const amounts = find(AMOUNT, text);
  const feeWords = f(FEE);
  const sendMoney = amounts.length ? f(SEND_MONEY) : [];
  const fee = feeWords.length || sendMoney.length ? [...feeWords, ...sendMoney, ...amounts] : [];
  const job = f(JOB);
  const parcel = f(PARCEL);
  const prize = f(PRIZE);
  if (fee.length && job.length) add('job_fee', 0.65, [...job, ...fee]);
  else if (fee.length && parcel.length) add('parcel_fee', 0.6, [...parcel, ...fee]);
  else if (fee.length) add('fee_request', prize.length ? 0.2 : 0.35, fee);
  const easy = f(EASY_MONEY);
  if (easy.length) add('easy_money', 0.45, easy);
  const invest = f(INVEST);
  if (invest.length) add('invest', 0.65, invest);
  if (prize.length) add('prize', fee.length || pinQr.length || risky.length || callback ? 0.6 : 0.35, prize);
  const held = f(HELD);
  if (parcel.length && held.length && !s.some((x) => x.id === 'parcel_fee')) add('parcel_held', 0.3, [...parcel, ...held], 'warn');
  const utility = f(UTILITY);
  const cut = f(CUT);
  if (utility.length && cut.length && (phones.length || risky.length)) add('bill_cut', 0.6, [...utility, ...cut]);


  // Claims to be a bank / company / government but asks to use contact details from the message.
  const kyc = f(KYC);
  const asksAction = callback || risky.length > 0 || s.some((x) => x.id === 'secret_request');
  if (kyc.length) add('kyc', asksAction || threat.length ? 0.45 : 0.2, kyc);
  if (asksAction) {
    for (const [brand, r] of BRANDS) {
      const hits = find(r, text);
      if (hits.length && !official.some((o) => o.brand === brand)) {
        add('impersonation', 0.35, hits, 'warn', { brand });
        break;
      }
    }
  }

  // Style
  const greet = f(GREETING);
  if (greet.length) add('generic_greeting', 0.12, greet, 'warn');
  const caps = [...text.matchAll(/\b[A-Z]{4,}\b/g)].filter((m) => !ACRONYMS.has(m[0])).map((m) => ({ start: m.index, end: m.index + m[0].length }));
  const bangs = [...text.matchAll(/!{2,}|[💰🎉🎁🤑💸🔥]{2,}/gu)].map((m) => ({ start: m.index, end: m.index + m[0].length }));
  if (caps.length >= 2 || bangs.length) add('shouting', 0.15, [...caps, ...bangs], 'warn');
  const typos = f(MISSPELL);
  if (typos.length) add('misspell', 0.25, typos, 'warn');
  const glyphs = find(HOMOGLYPH, text);
  if (glyphs.length) add('homoglyph', 0.5, glyphs);

  // A normal bank alert: it reports money moving on your own (masked) account or card and asks for
  // nothing. Scams that copy this style still ask for something (a code, a call, a link), so any strong
  // signal or a call-back number cancels it.
  const events = f(ALERT_EVENT);
  const distinctEvents = new Set(events.map((h) => text.slice(h.start, h.end).toLowerCase())).size;
  const bankNamed = BRANDS.some(([, r]) => find(r, text).length > 0);
  const bankAlert = events.length > 0 && (f(MASKED_ACCOUNT).length > 0 || distinctEvents >= 2 || bankNamed)
    && !callback && !s.some((x) => x.weight >= 0.45);
  // Nothing to act on: no link, no number, no money or code request. The model alone counts less then.
  const mobiles = phones.filter((h) => /^(?:\+?91[ -]?|0)?[6-9]/.test(text.slice(h.start, h.end)));
  const quiet = !links.length && !mobiles.length && !fee.length && !/\breply\b|जवाब दें|उत्तर द्या/i.test(text) && !s.some((x) => x.id === 'secret_request' || x.id === 'pin_to_receive');

  // Combine: each signal raises the risk independently (noisy-OR), the model counts as one more signal.
  // The model adds nothing below 0.35, and counts half for Hindi/Marathi script, where it saw few
  // hand-written training messages. It counts much less for bank alerts, which the UCI data lacks.
  const mlWeight = (detectLang(text) ? 0.5 : 0.9) * (bankAlert ? 0.15 : quiet ? 0.6 : 1) * Math.max(0, (ml - 0.35) / 0.65);
  const damp = bankAlert ? 0.5 : 1;
  let risk = 1 - (1 - mlWeight) * s.reduce((acc, x) => acc * (1 - x.weight * damp), 1);
  const otpNotice = !s.some((x) => x.id === 'secret_request') && neg.length > 0 && f(SECRET).length > 0;
  if (otpNotice) risk *= 0.5;
  const allOfficial = official.length > 0 && risky.length === 0;
  if (allOfficial) risk *= 0.4;
  if (s.some((x) => x.weight >= 0.6)) risk = Math.max(risk, 0.45);
  // "Likely scam" needs at least one concrete rule hit, so it always comes with a reason you can check.
  const concrete = s.some((x) => x.weight >= 0.45) || s.filter((x) => x.weight >= 0.25).length >= 2;
  if (!concrete) risk = Math.min(risk, 0.69);
  // A message that asks for nothing and has no warning sign stays "Looks safe", whatever the model says.
  if (quiet && !s.some((x) => x.weight >= 0.25)) risk = Math.min(risk, 0.35);
  const verdict: Verdict = risk >= 0.7 ? 'scam' : risk >= 0.4 ? 'suspicious' : 'safe';

  // Reasons: strongest signals first, 2 to 4 of them.
  const reasons: Reason[] = [];
  const sorted = [...s].sort((a, b) => b.weight - a.weight);
  if (verdict !== 'safe') {
    for (const x of sorted) if (reasons.length < 4 && x.weight >= 0.2) reasons.push({ id: x.id, tone: 'bad', brand: x.brand, host: x.host });
    if (reasons.length < 4 && ml >= 0.75) reasons.push({ id: 'ml_high', tone: 'bad' });
    else if (reasons.length < 2 && ml >= 0.4) reasons.push({ id: 'ml_mid', tone: 'bad' });
    for (const x of sorted) if (reasons.length < 2 && !reasons.some((r) => r.id === x.id)) reasons.push({ id: x.id, tone: 'bad', brand: x.brand, host: x.host });
  } else {
    if (bankAlert) reasons.push({ id: 'bank_alert', tone: 'good' });
    if (otpNotice) reasons.push({ id: 'otp_notice', tone: 'good' });
    if (allOfficial) reasons.push({ id: 'official_link', tone: 'good', brand: official[0].brand });
    if (quiet && reasons.length < 3) reasons.push({ id: 'no_asks', tone: 'good' });
    if (ml < 0.3 && reasons.length < 3) reasons.push({ id: 'ml_low', tone: 'good' });
    for (const x of sorted) {
      if (reasons.length < 4 && x.weight >= 0.1 && (!bankAlert || x.severity === 'link')) reasons.push({ id: x.id, tone: 'info', brand: x.brand, host: x.host });
    }
  }

  // Highlights: merge overlapping spans, the more serious kind wins. A safe bank alert only shows its links.
  const rank: Record<Severity, number> = { danger: 3, link: 2, warn: 1 };
  const shown = verdict === 'safe' && bankAlert ? s.filter((x) => x.severity === 'link') : s;
  const raw = shown.flatMap((x) => x.hits.map((h) => ({ ...h, severity: x.severity })));
  for (const l of links) raw.push({ start: l.start, end: l.end, severity: l.kind === 'lookalike' || l.kind === 'ip' ? 'danger' : 'link' });
  raw.sort((a, b) => a.start - b.start || b.end - a.end);
  const spans: Span[] = [];
  for (const h of raw) {
    const last = spans[spans.length - 1];
    if (last && h.start < last.end) {
      last.end = Math.max(last.end, h.end);
      if (rank[h.severity] > rank[last.severity]) last.severity = h.severity;
    } else spans.push({ ...h });
  }

  return { verdict, risk, ml, reasons, spans, detectedLang: detectLang(text) };
}
