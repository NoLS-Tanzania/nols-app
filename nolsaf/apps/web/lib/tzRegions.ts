export type Region = { id: string; name: string; districts: string[] };

const RD: Record<string, string[]> = {
  "Dar es Salaam": ["Ilala","Kinondoni","Ubungo","Temeke","Kigamboni"],
  "Dodoma": ["Dodoma","Chamwino","Kongwa","Mpwapwa","Bahi","Chemba","Kondoa"],
  "Arusha": ["Arusha Urban","Arusha DC","Karatu","Meru","Longido","Monduli","Ngorongoro"],
  "Mwanza": ["Mwanza Urban","Ilemela","Nyamagana","Magu","Sengerema","Misungwi","Kwimba","Buchosa"],
  "Kilimanjaro": ["Moshi Municipal","Moshi Rural","Hai","Siha","Mwanga","Same"],
  "Tanga": ["Tanga Urban","Korogwe Urban","Korogwe DC","Handeni","Lushoto","Pangani","Mkinga"],
  "Mara": ["Mara Urban","Musoma","Butiama","Bunda","Rorya","Serengeti","Tarime"],
  "Mbeya": ["Mbeya Urban","Mbeya DC","Rungwe","Mbarali","Chunya","Kyela","Mbozi","Busokelo"],
  "Morogoro": ["Morogoro Urban","Morogoro Rural","Kilosa","Kilombero","Ulanga","Gairo","Mvomero"],
  "Mtwara": ["Mtwara Urban","Mtwara DC","Masasi","Nanyumbu","Newala","Tandahimba"],
  "Lindi": ["Lindi Urban","Lindi DC","Kilwa","Nachingwea","Ruangwa","Liwale"],
  "Ruvuma": ["Songea Urban","Songea DC","Tunduru","Namtumbo","Mbinga","Nyasa"],
  "Rukwa": ["Sumbawanga Urban","Sumbawanga DC","Nkasi","Kalambo"],
  "Rukwa (old)": ["Sumbawanga"],
  "Katavi": ["Mpanda","Mlele","Nsimbo"],
  "Geita": ["Geita","Mbogwe","Chato","Bukombe"],
  "Kagera": ["Mwanza region border","Biharamulo","Kyerwa","Ngara","Muleba","Karagwe","Bukoba"],
  "Singida": ["Singida Urban","Ikungi","Manyoni","Mkalama","Iramba"],
  "Simiyu": ["Simiyu","Itilima","Maswa","Busega","Meatu"],
  "Shinyanga": ["Shinyanga Urban","Kahama","Ushetu","Kishapu"],
  "Tabora": ["Tabora Urban","Nzega","Uyui","Kaliua","Igunga"],
  "Songwe": ["Songwe","Tunduma","Mbozi","Momba"],
  "Pwani": ["Kibaha","Bagamoyo","Kisarawe","Rufiji","Mafia"],
  "Njombe": ["Njombe","Wanging'ombe","Makambako","Ludewa"],
  "Iringa": ["Iringa Urban","Iringa DC","Kilolo","Mafinga","Mufindi"],
  "Other": ["Other"],
};

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const REGIONS = Object.entries(RD).map(([name, districts]) => ({
  id: slug(name),
  name,
  districts,
})) as Region[];

export const REGION_BY_ID: Record<string, Region> =
  Object.fromEntries(REGIONS.map(r => [r.id, r])) as Record<string, Region>;
