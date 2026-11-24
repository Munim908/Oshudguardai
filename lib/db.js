// ডেমো ডেটাবেস: পরে DGDA ৩৫,০০০+ ব্র্যান্ড দিয়ে বদলান (Postgres/Qdrant)
export const GEN = {
  montelukast:{bn:'মন্টেলুকাস্ট'}, fexofenadine:{bn:'ফেক্সোফেনাডিন',cls:'antihistamine'},
  cetirizine:{bn:'সেটিরিজিন',cls:'antihistamine'}, levocetirizine:{bn:'লেভোসেটিরিজিন',cls:'antihistamine'},
  famotidine:{bn:'ফ্যামোটিডিন'}, deflazacort:{bn:'ডেফ্লাজাকোর্ট (স্টেরয়েড)',cls:'steroid'},
  fluticasone:{bn:'ফ্লুটিকাসোন (নাকের স্প্রে)'}, vitaminc:{bn:'ভিটামিন সি'},
  paracetamol:{bn:'প্যারাসিটামল'}, omeprazole:{bn:'ওমেপ্রাজল',cls:'ppi'}, esomeprazole:{bn:'এসোমেপ্রাজল',cls:'ppi'},
  ibuprofen:{bn:'আইবুপ্রোফেন',cls:'nsaid'}, diclofenac:{bn:'ডাইক্লোফেনাক',cls:'nsaid'}, naproxen:{bn:'ন্যাপ্রক্সেন',cls:'nsaid'},
  aspirin:{bn:'অ্যাসপিরিন',cls:'antiplatelet'}, clopidogrel:{bn:'ক্লোপিডোগ্রেল',cls:'antiplatelet'}, warfarin:{bn:'ওয়ারফারিন'},
  losartan:{bn:'লোসার্টান'}, azithromycin:{bn:'অ্যাজিথ্রোমাইসিন'}, atorvastatin:{bn:'অ্যাটরভাস্ট্যাটিন'}
};
export const BRANDS = {
  montene:'montelukast', monas:'montelukast', montair:'montelukast', fexo:'fexofenadine', telfast:'fexofenadine',
  alatrol:'cetirizine', ceti:'cetirizine', famotil:'famotidine', deflacort:'deflazacort', avamist:'fluticasone', cevit:'vitaminc',
  napa:'paracetamol', ace:'paracetamol', seclo:'omeprazole', omep:'omeprazole', maxpro:'esomeprazole', sergel:'esomeprazole',
  brufen:'ibuprofen', voltaren:'diclofenac', clofenac:'diclofenac', naprox:'naproxen', naprosyn:'naproxen',
  ecosprin:'aspirin', clopid:'clopidogrel', plavix:'clopidogrel', osartil:'losartan', zithrox:'azithromycin', atova:'atorvastatin'
};
Object.keys(GEN).forEach(g => (BRANDS[g] = g));
export const CLS = {nsaid:'ব্যথানাশক (NSAID)',ppi:'গ্যাস্ট্রিকের (PPI)',antihistamine:'অ্যালার্জির (অ্যান্টিহিস্টামিন)'};
// [A, B, level, বাংলা ব্যাখ্যা]  (A/B = generic বা class)
export const RULES = [
  ['nsaid','aspirin','r','দুটোই পেটে রক্তক্ষরণের ঝুঁকি বাড়ায়।'],
  ['nsaid','warfarin','r','রক্তক্ষরণের ঝুঁকি অনেক বেড়ে যায়।'],
  ['nsaid','steroid','a','একসাথে খেলে পেটে ঘা ও রক্তক্ষরণের ঝুঁকি বাড়ে।'],
  ['aspirin','warfarin','r','রক্তক্ষরণের ঝুঁকি অনেক বেড়ে যায়।'],
  ['aspirin','clopidogrel','a','একসাথে রক্তক্ষরণের ঝুঁকি বাড়ে। ডাক্তার ইচ্ছা করে দিলে ঠিক আছে।'],
  ['clopidogrel','omeprazole','a','ওমেপ্রাজল ক্লোপিডোগ্রেলের কাজ কমাতে পারে।'],
  ['nsaid','losartan','a','কিডনির ওপর চাপ পড়তে পারে।'],
  ['azithromycin','warfarin','a','রক্ত পাতলা হওয়ার মাত্রা বাড়তে পারে।'],
  ['atorvastatin','azithromycin','a','পেশিতে ব্যথার ঝুঁকি সামান্য বাড়তে পারে।']
];
