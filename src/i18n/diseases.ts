import diseaseClasses from "@/data/plant_disease_classes.json";
import type { Language } from "./translations";

export interface DiseaseText {
  plant: string;
  name: string;
  description: string;
  treatment: string;
  water?: string;
}

interface DiseaseRecord {
  disease_name: string;
  description: string;
  treatement: string;
  fertilizerName?: string;
  waterLevel?: string;
}

const PLANTS: Record<string, Record<Language, string>> = {
  "Cicer arietinum": { en: "Chickpea", hi: "चना", mr: "हरभरा" },
  Hibiscus: { en: "Hibiscus", hi: "गुड़हल", mr: "जास्वंद" },
  mango: { en: "Mango", hi: "आम", mr: "आंबा" },
  Jowar: { en: "Jowar (Sorghum)", hi: "ज्वार", mr: "ज्वारी" },
};

// Hindi and Marathi text for each model class. English comes from plant_disease_classes.json.
const LOCALIZED: Record<string, Partial<Record<Exclude<Language, "en">, Omit<DiseaseText, "plant">>>> = {
  "Cicer arietinum_healthy": {
    hi: {
      name: "स्वस्थ",
      description: "चने की पत्ती स्वस्थ है, रोग या तनाव का कोई लक्षण नहीं है।",
      treatment: "नियमित निगरानी और अच्छी कृषि पद्धतियाँ जारी रखें।",
      water: "मध्यम सिंचाई (मिट्टी में 60-70% नमी बनाए रखें; पानी जमा न होने दें)",
    },
    mr: {
      name: "निरोगी",
      description: "हरभऱ्याचे पान निरोगी आहे, रोग किंवा ताणाची कोणतीही लक्षणे नाहीत.",
      treatment: "नियमित निरीक्षण आणि चांगल्या शेती पद्धती सुरू ठेवा.",
      water: "मध्यम पाणी (मातीत 60-70% ओलावा ठेवा; पाणी साचू देऊ नका)",
    },
  },
  "Cicer arietinum_Alternaria_Leaf_Spot": {
    hi: {
      name: "अल्टरनेरिया पत्ती धब्बा",
      description: "इस रोग में चने की पत्तियों पर गोल छल्लों वाले भूरे धब्बे बनते हैं।",
      treatment: "मैनकोज़ेब या क्लोरोथैलोनिल वाले फफूंदनाशक का छिड़काव करें।",
    },
    mr: {
      name: "अल्टरनेरिया पानावरील ठिपके",
      description: "या रोगात हरभऱ्याच्या पानांवर वर्तुळाकार कड्यांचे तपकिरी ठिपके पडतात.",
      treatment: "मॅन्कोझेब किंवा क्लोरोथॅलोनिलयुक्त बुरशीनाशकाची फवारणी करा.",
    },
  },
  "Cicer arietinum_Dry_leaves": {
    hi: {
      name: "सूखी पत्तियाँ",
      description: "पानी की कमी या पोषक तत्वों की कमी से पत्तियाँ सूख रही हैं।",
      treatment: "पर्याप्त सिंचाई करें और संतुलित उर्वरक डालें।",
    },
    mr: {
      name: "वाळलेली पाने",
      description: "पाण्याचा ताण किंवा अन्नद्रव्यांच्या कमतरतेमुळे पाने वाळत आहेत.",
      treatment: "पुरेसे पाणी द्या आणि संतुलित खत वापरा.",
    },
  },
  Hibiscus_healthy: {
    hi: {
      name: "स्वस्थ",
      description: "गुड़हल की पत्ती स्वस्थ और चमकदार रंग की है।",
      treatment: "नियमित देखभाल और पोषण प्रबंधन जारी रखें।",
      water: "नियमित पानी (मिट्टी को लगातार नम रखें पर गीला न करें; हफ्ते में 2-3 बार पानी दें)",
    },
    mr: {
      name: "निरोगी",
      description: "जास्वंदीचे पान निरोगी आणि चमकदार रंगाचे आहे.",
      treatment: "नियमित काळजी आणि अन्नद्रव्य व्यवस्थापन सुरू ठेवा.",
      water: "नियमित पाणी (माती सतत ओलसर ठेवा पण चिखल करू नका; आठवड्यातून 2-3 वेळा पाणी द्या)",
    },
  },
  Hibiscus_powdery_mildew: {
    hi: {
      name: "चूर्णिल आसिता (पाउडरी मिल्ड्यू)",
      description: "पत्तियों पर सफ़ेद पाउडर जैसी फफूंद।",
      treatment: "सल्फर आधारित फफूंदनाशक का छिड़काव करें।",
    },
    mr: {
      name: "भुरी रोग",
      description: "पानांवर पांढऱ्या पावडरसारखी बुरशी.",
      treatment: "गंधकयुक्त बुरशीनाशकाची फवारणी करा.",
    },
  },
  Hibiscus_Insect_damage: {
    hi: {
      name: "कीट क्षति",
      description: "कीड़ों के खाने से पत्ती को नुकसान।",
      treatment: "नीम तेल या सिस्टमिक कीटनाशक का उपयोग करें।",
    },
    mr: {
      name: "किडीमुळे नुकसान",
      description: "किडींनी पाने खाल्ल्याने झालेले नुकसान.",
      treatment: "निंबोळी तेल किंवा आंतरप्रवाही कीटकनाशक वापरा.",
    },
  },
  Hibiscus_Dried_leaf: {
    hi: {
      name: "सूखी पत्ती",
      description: "तनाव या गलत सिंचाई से पत्तियाँ सूख रही हैं।",
      treatment: "सिंचाई सुधारें और संतुलित पोषक तत्व दें।",
    },
    mr: {
      name: "वाळलेले पान",
      description: "ताण किंवा चुकीच्या पाणी व्यवस्थापनामुळे पाने वाळत आहेत.",
      treatment: "पाणी व्यवस्थापन सुधारा आणि संतुलित अन्नद्रव्ये द्या.",
    },
  },
  Hibiscus_yellow_chlorosis: {
    hi: {
      name: "पीलापन (क्लोरोसिस)",
      description: "सूक्ष्म पोषक तत्वों की कमी से पत्तियाँ पीली हो रही हैं।",
      treatment: "आयरन या सूक्ष्म पोषक तत्व मिश्रण डालें।",
    },
    mr: {
      name: "पिवळेपणा (क्लोरोसिस)",
      description: "सूक्ष्म अन्नद्रव्यांच्या कमतरतेमुळे पाने पिवळी पडत आहेत.",
      treatment: "लोह किंवा सूक्ष्म अन्नद्रव्य मिश्रण द्या.",
    },
  },
  mango_healthy: {
    hi: {
      name: "स्वस्थ",
      description: "आम की पत्ती स्वस्थ है।",
      treatment: "उर्वरक का सही समय-सारिणी बनाए रखें।",
      water: "हल्की पर गहरी सिंचाई (हर 7-10 दिन में पानी दें; ज़्यादा नमी से बचें)",
    },
    mr: {
      name: "निरोगी",
      description: "आंब्याचे पान निरोगी आहे.",
      treatment: "खत देण्याचे योग्य वेळापत्रक पाळा.",
      water: "हलके पण खोल पाणी (दर 7-10 दिवसांनी पाणी द्या; जास्त ओलावा टाळा)",
    },
  },
  mango_Powderly_Mildew: {
    hi: {
      name: "चूर्णिल आसिता (पाउडरी मिल्ड्यू)",
      description: "पत्तियों और फूलों पर सफ़ेद फफूंद।",
      treatment: "सल्फर फफूंदनाशक का छिड़काव करें।",
    },
    mr: {
      name: "भुरी रोग",
      description: "पानांवर आणि मोहोरावर पांढरी बुरशी.",
      treatment: "गंधकयुक्त बुरशीनाशकाची फवारणी करा.",
    },
  },
  mango_Mango_rust: {
    hi: {
      name: "आम का रतुआ",
      description: "पत्तियों पर लाल-भूरे फफोले।",
      treatment: "कॉपर आधारित फफूंदनाशक का छिड़काव करें।",
    },
    mr: {
      name: "आंब्यावरील तांबेरा",
      description: "पानांवर लालसर-तपकिरी फोड.",
      treatment: "तांबेयुक्त बुरशीनाशकाची फवारणी करा.",
    },
  },
  mango_Bacterial_Leaf_Spot: {
    hi: {
      name: "जीवाणु पत्ती धब्बा",
      description: "पत्तियों पर गहरे, पानी से भीगे जैसे धब्बे।",
      treatment: "कॉपर फफूंदनाशक का छिड़काव करें।",
    },
    mr: {
      name: "जिवाणूजन्य पानावरील ठिपके",
      description: "पानांवर गडद, पाणी शोषल्यासारखे ठिपके.",
      treatment: "तांबेयुक्त बुरशीनाशकाची फवारणी करा.",
    },
  },
  mango_Dried_leaves: {
    hi: {
      name: "सूखी पत्तियाँ",
      description: "तनाव या रोग से पत्तियाँ सूख रही हैं।",
      treatment: "सिंचाई और पोषक तत्वों की आपूर्ति सुधारें।",
    },
    mr: {
      name: "वाळलेली पाने",
      description: "ताण किंवा रोगामुळे पाने वाळत आहेत.",
      treatment: "पाणी आणि अन्नद्रव्यांचा पुरवठा सुधारा.",
    },
  },
  mango_Nutrient_Deficiency: {
    hi: {
      name: "पोषक तत्वों की कमी",
      description: "पोषक तत्वों की कमी से पत्तियाँ पीली या फीकी हैं।",
      treatment: "संतुलित उर्वरक या सूक्ष्म पोषक तत्व मिश्रण डालें।",
    },
    mr: {
      name: "अन्नद्रव्यांची कमतरता",
      description: "अन्नद्रव्यांच्या कमतरतेमुळे पाने फिकट किंवा पिवळी आहेत.",
      treatment: "संतुलित खत किंवा सूक्ष्म अन्नद्रव्य मिश्रण द्या.",
    },
  },
  Jowar_healthy: {
    hi: {
      name: "स्वस्थ",
      description: "ज्वार की पत्ती स्वस्थ है।",
      treatment: "मिट्टी की उर्वरता बनाए रखें।",
      water: "मध्यम सिंचाई (अंकुरण, फूल आने और दाना भरने के समय पानी दें)",
    },
    mr: {
      name: "निरोगी",
      description: "ज्वारीचे पान निरोगी आहे.",
      treatment: "जमिनीची सुपीकता टिकवून ठेवा.",
      water: "मध्यम पाणी (उगवण, फुलोरा आणि दाणे भरण्याच्या वेळी पाणी द्या)",
    },
  },
  "Jowar_Anthracnose(Leaf Blight)": {
    hi: {
      name: "एन्थ्रेक्नोज (पत्ती झुलसा)",
      description: "पत्तियों पर लाल किनारों वाले गहरे धब्बे।",
      treatment: "एज़ोक्सीस्ट्रोबिन फफूंदनाशक का छिड़काव करें।",
    },
    mr: {
      name: "करपा (अँथ्रॅक्नोज)",
      description: "पानांवर लाल कडांचे गडद ठिपके.",
      treatment: "अझॉक्सिस्ट्रोबिन बुरशीनाशकाची फवारणी करा.",
    },
  },
  Jowar_Jowar_rust: {
    hi: {
      name: "ज्वार का रतुआ",
      description: "लाल-भूरे रतुआ फफोले।",
      treatment: "सल्फर आधारित फफूंदनाशक का छिड़काव करें।",
    },
    mr: {
      name: "ज्वारीवरील तांबेरा",
      description: "लालसर-तपकिरी तांबेऱ्याचे फोड.",
      treatment: "गंधकयुक्त बुरशीनाशकाची फवारणी करा.",
    },
  },
  Jowar_black_mold: {
    hi: {
      name: "काली फफूंद",
      description: "कीटों के प्रकोप से काली फफूंद की बढ़त।",
      treatment: "कीटों पर नियंत्रण करें और खेत साफ़ रखें।",
    },
    mr: {
      name: "काळी बुरशी",
      description: "किडींच्या प्रादुर्भावामुळे काळी बुरशी वाढते.",
      treatment: "किडींचे नियंत्रण करा आणि शेत स्वच्छ ठेवा.",
    },
  },
  Jowar_Dry_leaves: {
    hi: {
      name: "सूखी पत्तियाँ",
      description: "तनाव के कारण पत्तियाँ सूख रही हैं।",
      treatment: "सिंचाई और संतुलित उर्वरक सुनिश्चित करें।",
    },
    mr: {
      name: "वाळलेली पाने",
      description: "ताणामुळे पाने वाळत आहेत.",
      treatment: "पुरेसे पाणी आणि संतुलित खत द्या.",
    },
  },
};

const records = diseaseClasses as DiseaseRecord[];

export const isHealthyClass = (cls: string) => cls.trim().toLowerCase().endsWith("_healthy");

/** Turn "mango_Bacterial_Leaf_Spot" into "Bacterial Leaf Spot". */
const englishName = (cls: string) => {
  const parts = cls.trim().split("_");
  let rest = parts.length > 1 ? parts.slice(1) : parts;
  // "Jowar_Jowar_rust" / "mango_Mango_rust" repeat the plant name
  if (rest.length > 1 && rest[0].toLowerCase() === parts[0].toLowerCase()) rest = rest.slice(1);
  return rest
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/\s*\(\s*/g, " (")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .replace(/^Powderly/, "Powdery");
};

export const getDiseaseInfo = (cls: string, lang: Language) => {
  const key = cls.trim();
  const record = records.find((d) => d.disease_name.trim() === key);
  const plantKey = Object.keys(PLANTS).find((p) => key.startsWith(p));
  const localized = lang !== "en" ? LOCALIZED[key]?.[lang] : undefined;

  const text: DiseaseText = {
    plant: plantKey ? PLANTS[plantKey][lang] : key.split("_")[0],
    name: localized?.name ?? englishName(key),
    description: localized?.description ?? record?.description ?? "",
    treatment: localized?.treatment ?? record?.treatement ?? "",
    water: localized?.water ?? record?.waterLevel?.replace(/^Water requirement:\s*/, ""),
  };

  return { ...text, product: record?.fertilizerName ?? "", healthy: isHealthyClass(key) };
};
