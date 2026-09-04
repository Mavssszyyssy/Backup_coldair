const numberedBarangays = (count) => Array.from(
  { length: count },
  (_, index) => `Barangay ${index + 1}`,
);

export const LUZON_ADDRESS_DATA = [
  {
    region: 'NCR',
    provinces: [
      {
        province: 'Metro Manila',
        cities: [
          { city: 'Quezon City', barangays: ['Batasan Hills', 'Commonwealth', 'Holy Spirit', 'Tandang Sora', 'Bagumbayan', 'Novaliches Proper', 'Fairview', 'Payatas', 'Project 6', 'Project 8'] },
          { city: 'Manila', barangays: ['Ermita', 'Malate', 'Sampaloc', 'Tondo', 'Paco', 'Binondo', 'Santa Cruz', 'Quiapo', 'San Andres', 'San Miguel'] },
          { city: 'Makati', barangays: ['Bel-Air', 'Poblacion', 'San Lorenzo', 'Urdaneta', 'Bangkal', 'Cembo', 'Comembo', 'Guadalupe Nuevo', 'Guadalupe Viejo', 'Magallanes'] },
          { city: 'Pasig', barangays: ['Kapitolyo', 'San Antonio', 'Rosario', 'Ugong', 'Caniogan', 'Bagong Ilog', 'Maybunga', 'Manggahan', 'Pinagbuhatan', 'Santolan'] },
          { city: 'Pasay City', barangays: numberedBarangays(201) },
        ],
      },
    ],
  },
  {
    region: 'Central Luzon',
    provinces: [
      {
        province: 'Bulacan',
        cities: [
          { city: 'Malolos', barangays: ['Guinhawa', 'Longos', 'Santo Rosario', 'Tikay', 'Bulihan', 'Bagna', 'Barihan', 'Mojon', 'Santisima Trinidad', 'Sumapang Matanda'] },
          { city: 'Meycauayan', barangays: ['Bayugo', 'Caingin', 'Calvario', 'Camalig', 'Liputan', 'Banga', 'Bahay Pare', 'Libtong', 'Malhacan', 'Tukod'] },
          { city: 'Plaridel', barangays: ['Banga I', 'Banga II', 'Bintog', 'Culianin', 'Lalangan', 'Agnaya', 'Bagong Silang', 'Parulan', 'Poblacion', 'Tabang'] },
          { city: 'San Jose del Monte', barangays: ['Assumption', 'Dulong Bayan', 'Gaya-Gaya', 'Minuyan', 'Tungkong Mangga', 'Citrus', 'Fatima', 'Muzon', 'San Manuel', 'Santo Cristo'] },
        ],
      },
      {
        province: 'Bataan',
        cities: [
          { city: 'Balanga', barangays: ['Bagumbayan', 'Cupang North', 'Cupang Proper', 'Ibayo', 'Poblacion', 'Cabog-Cabog', 'Doña Francisca', 'Puerto Rivas Ibaba', 'Tenejero', 'Tortugas'] },
          { city: 'Dinalupihan', barangays: ['Gen. Luna', 'Layac', 'Payangan', 'Pita', 'San Ramon', 'Bangal', 'Luacan', 'Magsaysay', 'Payao', 'Tucop'] },
          { city: 'Mariveles', barangays: ['Alion', 'Baseco Country', 'Batangas II', 'Lucanin', 'San Carlos', 'Alas-asin', 'Camaya', 'Malaya', 'Mt. View', 'Townsite'] },
        ],
      },
      {
        province: 'Pampanga',
        cities: [
          { city: 'Angeles', barangays: ['Anunas', 'Balibago', 'Cutcut', 'Pampang', 'Pulung Maragul', 'Amsic', 'Claro M. Recto', 'Malabanias', 'Ninoy Aquino', 'Santo Rosario'] },
          { city: 'San Fernando', barangays: ['Del Pilar', 'Lourdes', 'Maimpis', 'Sindalan', 'Telabastagan', 'Dolores', 'Juliana', 'Calulut', 'San Jose', 'Lara'] },
          { city: 'Mabalacat', barangays: ['Camachiles', 'Dau', 'Mawaque', 'San Francisco', 'Tabun', 'Atlu-Bola', 'Bical', 'Bundagul', 'Mabiga', 'San Joaquin'] },
        ],
      },
    ],
  },
  {
    region: 'CALABARZON',
    provinces: [
      {
        province: 'Cavite',
        cities: [
          { city: 'Bacoor', barangays: ['Alima', 'Aniban I', 'Aniban II', 'Aniban III', 'Aniban IV', 'Aniban V', 'Banalo', 'Bayanan', 'Mabolo I', 'Mabolo II', 'Mabolo III', 'Mambog I', 'Mambog II', 'Mambog III', 'Mambog IV', 'Mambog V', 'Molino I', 'Molino II', 'Molino III', 'Molino IV', 'Molino V', 'Molino VI', 'Molino VII', 'Niog I', 'Niog II', 'Niog III', 'Panapaan I', 'Panapaan II', 'Panapaan III', 'Panapaan IV', 'Panapaan V', 'Panapaan VI', 'P.F. Espiritu I', 'P.F. Espiritu II', 'P.F. Espiritu III', 'P.F. Espiritu IV', 'P.F. Espiritu V', 'P.F. Espiritu VI', 'P.F. Espiritu VII', 'P.F. Espiritu VIII', 'P.F. Espiritu IX', 'P.F. Espiritu X', 'Real I', 'Real II', 'Salinas I', 'Salinas II', 'Salinas III', 'Talaba I', 'Talaba II', 'Talaba III', 'Talaba IV', 'Talaba V', 'Talaba VI', 'Talaba VII', 'Zapote I', 'Zapote II', 'Zapote III', 'Zapote IV', 'Zapote V'] },
          { city: 'Dasmarinas', barangays: ['Burol', 'Burol I', 'Burol II', 'Burol III', 'Datu Esmael', 'Emmanuel Bergado I', 'Emmanuel Bergado II', 'Fatima I', 'Fatima II', 'Langkaan I', 'Langkaan II', 'Luzviminda I', 'Luzviminda II', 'Paliparan I', 'Paliparan II', 'Paliparan III', 'Salawag', 'Salitran I', 'Salitran II', 'Salitran III', 'Sampaloc I', 'Sampaloc II', 'Sampaloc III', 'Sampaloc IV', 'San Agustin I', 'San Agustin II', 'San Andres I', 'San Andres II', 'San Antonio De Padua I', 'San Antonio De Padua II', 'San Dionisio', 'San Esteban', 'San Francisco I', 'San Francisco II', 'San Jose', 'San Luis I', 'San Luis II', 'San Manuel I', 'San Manuel II', 'San Mateo', 'San Miguel', 'San Nicolas I', 'San Nicolas II', 'San Roque', 'Santa Cristina I', 'Santa Cristina II', 'Santa Cruz I', 'Santa Cruz II', 'Santa Fe', 'Santa Lucia', 'Santa Maria', 'Santo Cristo', 'Santo Niño I', 'Santo Niño II', 'Victoria Reyes'] },
          { city: 'Imus', barangays: ['Alapan I-A', 'Alapan I-B', 'Alapan I-C', 'Alapan II-A', 'Alapan II-B', 'Anabu I-A', 'Anabu I-B', 'Anabu I-C', 'Anabu I-D', 'Anabu I-E', 'Anabu I-F', 'Anabu I-G', 'Anabu II-A', 'Anabu II-B', 'Anabu II-C', 'Anabu II-D', 'Anabu II-E', 'Anabu II-F', 'Bagong Silang', 'Bayan Luma I', 'Bayan Luma II', 'Bayan Luma III', 'Bayan Luma IV', 'Bayan Luma V', 'Bayan Luma VI', 'Bayan Luma VII', 'Bayanan Luma I', 'Bayanan Luma II', 'Bayanan Luma III', 'Bayanan Luma IV', 'Bayanan Luma V', 'Bucandala I', 'Bucandala II', 'Bucandala III', 'Carsadang Bago I', 'Carsadang Bago II', 'Magdalo', 'Maharlika', 'Medicion I-A', 'Medicion I-B', 'Medicion I-C', 'Medicion I-D', 'Medicion II-A', 'Medicion II-B', 'Medicion II-C', 'Poblacion I-A', 'Poblacion I-B', 'Poblacion I-C', 'Poblacion II-A', 'Poblacion II-B', 'Poblacion III-A', 'Poblacion III-B', 'Poblacion IV-A', 'Poblacion IV-B', 'Poblacion IV-C', 'Poblacion IV-D', 'Tanzang Luma I', 'Tanzang Luma II', 'Tanzang Luma III', 'Tanzang Luma IV', 'Tanzang Luma V', 'Tanzang Luma VI', 'Toclong I-A', 'Toclong I-B', 'Toclong I-C', 'Toclong II-A', 'Toclong II-B'] },
          { city: 'General Trias', barangays: ['Biclatan', 'Buenavista I', 'Buenavista II', 'Buenavista III', 'Corregidor', 'Dulong Bayan', 'Governor Ferrer', 'Javalera', 'Manggahan', 'Navarro', 'Panungyanan', 'Pasong Camachile I', 'Pasong Camachile II', 'Pasong Kawayan I', 'Pasong Kawayan II', 'Pinagtipunan', 'Sampalucan', 'San Francisco', 'San Gabriel', 'San Juan I', 'San Juan II', 'Santa Clara', 'Santiago', 'Tapia', 'Tejero'] },
        ],
      },
      {
        province: 'Laguna',
        cities: [
          { city: 'Calamba', barangays: ['Banadero', 'Bucal', 'Canlubang', 'Halang', 'Punta', 'Barandal', 'Batino', 'Lamesa', 'Majada Out', 'Parian', 'Real', 'Saimsim', 'Uno', 'Bagong Kalsada'] },
          { city: 'Cabuyao', barangays: ['Banay-Banay', 'Bigaa', 'Marinig', 'Mamatid', 'Sala', 'Baclaran', 'Banlic', 'Butong', 'Casile', 'Diezmo', 'Gulod', 'Niugan', 'Pittland'] },
          { city: 'Santa Rosa', barangays: ['Balibago', 'Caingin', 'Dita', 'Don Jose', 'Tagapo', 'Aplaya', 'Labas', 'Macabling', 'Malitlit', 'Market Area', 'Pooc', 'Pulong Santa Cruz', 'Santo Domingo'] },
          { city: 'San Pablo', barangays: ['Del Remedio', 'San Cristobal', 'San Jose', 'San Lucas I', 'Santisimo Rosario', 'Concepcion', 'Dolores', 'San Antonio I', 'San Antonio II', 'San Bartolome', 'San Buenaventura', 'San Gabriel', 'Santa Cruz', 'Santa Elena'] },
        ],
      },
      {
        province: 'Batangas',
        cities: [
          { city: 'Batangas City', barangays: ['Alangilan', 'Balagtas', 'Cuta', 'Kumintang Ibaba', 'Pallocan East', 'Bolbok', 'Concepcion', 'Kumintang Ilaya', 'Mabini', 'Sta. Clara', 'San Jose Sico', 'Libjo'] },
          { city: 'Lipa', barangays: ['Adya', 'Antipolo del Norte', 'Balintawak', 'Bugtong na Pulo', 'Sabang', 'Anilao', 'Bagong Pook', 'Bolbok', 'Inosluban', 'Marawoy', 'Pinagkawitan', 'Tambo'] },
          { city: 'Tanauan', barangays: ['Darasa', 'Janopol Oriental', 'Mabini', 'Santol', 'Wawa', 'Ambulong', 'Bagbag', 'Banjo East', 'Banjo West', 'Hidalgo', 'Poblacion I', 'Poblacion II'] },
        ],
      },
      {
        province: 'Rizal',
        cities: [
          { city: 'Antipolo', barangays: ['Bagong Nayon', 'Cupang', 'Dela Paz', 'Mambugan', 'San Jose', 'Beverly Hills', 'Calawis', 'Inarawan', 'Mayamot', 'Muntingdilaw', 'San Luis', 'Santa Cruz'] },
          { city: 'Taytay', barangays: ['Dolores', 'Muzon', 'San Isidro', 'Sta. Ana', 'Tikling', 'Angono', 'Bagumbayan', 'Maharlika', 'San Juan', 'Santa Ana'] },
          { city: 'Cainta', barangays: ['San Andres', 'San Isidro', 'Santo Domingo', 'Santo Nino', 'San Juan', 'Santa Rosa', 'San Roque'] },
        ],
      },
      {
        province: 'Quezon',
        cities: [
          { city: 'Lucena', barangays: ['Bocohan', 'Domoit', 'Gulang-Gulang', 'Ibabang Dupay', 'Isabang', 'Barra', 'Cotta', 'Ibabang Iyam', 'Ilayang Iyam', 'Kanlurang Mayao', 'Silangang Mayao', 'Talao-Talao'] },
          { city: 'Tayabas', barangays: ['Angeles Zone IV', 'Ibabang Bukal', 'Isabang', 'Lakawan', 'Wakas', 'Alitao', 'Domoit Kanluran', 'Ilasan Ibaba', 'Palale Ibaba', 'Talolong'] },
          { city: 'Sariaya', barangays: ['Concepcion Banahaw', 'Castañas', 'Guisguis Talon', 'Mamala I', 'Sampaloc I', 'Balubal', 'Bignay I', 'Bignay II', 'Concepcion Pinagbakuran', 'Manggalang I', 'Manggalang II'] },
        ],
      },
    ],
  },
  {
    region: 'Ilocos Region',
    provinces: [
      {
        province: 'Pangasinan',
        cities: [
          { city: 'Dagupan', barangays: ['Bacayao Norte', 'Bonuan Boquig', 'Lucao', 'Pantal', 'Tapuac', 'Bolosan', 'Caranglaan', 'Herrero', 'Lasip Chico', 'Malued', 'Mayombo', 'Pogo Grande'] },
          { city: 'San Carlos', barangays: ['Bocacliw', 'Calobaoan', 'Rizal', 'Tandoc', 'Tolonguat', 'Apalen', 'Bogaoan', 'Bocal', 'Bugallon-Posadas Street', 'Cobol', 'Palaming', 'Pangalangan'] },
          { city: 'Urdaneta', barangays: ['Anonas', 'Bactad East', 'Bayaoas', 'Nancamaliran East', 'Tipuso', 'Bactad Proper', 'Dilan-Paurido', 'Labit Proper', 'Macalong', 'Nancalobasaan', 'San Vicente', 'Tulong'] },
        ],
      },
      {
        province: 'La Union',
        cities: [
          { city: 'San Fernando', barangays: ['Bangbangolan', 'Carlatan', 'Catbangen', 'Pagdaraoan', 'Sibuan-Otong', 'Biday', 'Madayegdeg', 'Nagyubuyuban', 'Poro', 'Sevilla'] },
          { city: 'Bauang', barangays: ['Acao', 'Bagbag', 'Nagarangayan', 'Paringao', 'Pottot', 'Baccuit Norte', 'Baccuit Sur', 'Pugo', 'Payocpoc Norte', 'Payocpoc Sur'] },
          { city: 'Agoo', barangays: ['Ambitacay', 'Capas', 'Consolacion', 'San Agustin Norte', 'San Nicolas East', 'Macalva Norte', 'Macalva Sur', 'Nazareno', 'Santa Monica', 'San Manuel Norte'] },
        ],
      },
      {
        province: 'Ilocos Sur',
        cities: [
          { city: 'Vigan', barangays: ['Ayusan Norte', 'Ayusan Sur', 'Paratong', 'Pantay Fatima', 'Tamag', 'Beddeng Laud', 'Cabaroan Daya', 'Mira', 'San Julian Norte', 'San Julian Sur'] },
          { city: 'Candon', barangays: ['Bagani Campo', 'Cubcubbuot', 'Darapidap', 'San Andres', 'Tampugo', 'Bagani Gabor', 'Calaoa-an', 'Lingsat', 'San Jose', 'Talogtog'] },
        ],
      },
      {
        province: 'Ilocos Norte',
        cities: [
          { city: 'Laoag', barangays: ['Balatong', 'Butor', 'Dibong', 'San Nicolas', 'Suyo', 'Nangalisan', 'Santa Joaquina', 'Vira', 'Gabu Norte', 'Gabu Sur'] },
          { city: 'Batac', barangays: ['Ablan', 'Baay', 'Camguidan', 'Palpalicong', 'Sumader', 'Aglipay', 'Ben-agan', 'Bingao', 'Cabusligan', 'Columbia'] },
        ],
      },
    ],
  },
];
