import React, { useEffect, useMemo, useState } from 'react';

type CountryCallingCode = {
  iso: string;
  name: string;
  dialCode: string;
  trunkPrefix?: string;
};

// Gabon is the default because it is the application's primary market.
const COUNTRIES: CountryCallingCode[] = [
  { iso: 'GA', name: 'Gabon', dialCode: '241' },
  { iso: 'CM', name: 'Cameroun', dialCode: '237', trunkPrefix: '0' },
  { iso: 'CG', name: 'Congo', dialCode: '242', trunkPrefix: '0' },
  { iso: 'CD', name: 'République démocratique du Congo', dialCode: '243', trunkPrefix: '0' },
  { iso: 'GQ', name: 'Guinée équatoriale', dialCode: '240' },
  { iso: 'CF', name: 'République centrafricaine', dialCode: '236' },
  { iso: 'TD', name: 'Tchad', dialCode: '235', trunkPrefix: '0' },
  { iso: 'ST', name: 'Sao Tomé-et-Principe', dialCode: '239' },
  { iso: 'CI', name: 'Côte d’Ivoire', dialCode: '225' },
  { iso: 'SN', name: 'Sénégal', dialCode: '221', trunkPrefix: '0' },
  { iso: 'ML', name: 'Mali', dialCode: '223' },
  { iso: 'BF', name: 'Burkina Faso', dialCode: '226' },
  { iso: 'NE', name: 'Niger', dialCode: '227' },
  { iso: 'TG', name: 'Togo', dialCode: '228', trunkPrefix: '0' },
  { iso: 'BJ', name: 'Bénin', dialCode: '229', trunkPrefix: '0' },
  { iso: 'GN', name: 'Guinée', dialCode: '224', trunkPrefix: '0' },
  { iso: 'GW', name: 'Guinée-Bissau', dialCode: '245' },
  { iso: 'SL', name: 'Sierra Leone', dialCode: '232', trunkPrefix: '0' },
  { iso: 'LR', name: 'Liberia', dialCode: '231', trunkPrefix: '0' },
  { iso: 'GH', name: 'Ghana', dialCode: '233', trunkPrefix: '0' },
  { iso: 'NG', name: 'Nigeria', dialCode: '234', trunkPrefix: '0' },
  { iso: 'MR', name: 'Mauritanie', dialCode: '222' },
  { iso: 'CV', name: 'Cap-Vert', dialCode: '238' },
  { iso: 'MA', name: 'Maroc', dialCode: '212', trunkPrefix: '0' },
  { iso: 'DZ', name: 'Algérie', dialCode: '213', trunkPrefix: '0' },
  { iso: 'TN', name: 'Tunisie', dialCode: '216' },
  { iso: 'LY', name: 'Libye', dialCode: '218' },
  { iso: 'EG', name: 'Égypte', dialCode: '20', trunkPrefix: '0' },
  { iso: 'SD', name: 'Soudan', dialCode: '249', trunkPrefix: '0' },
  { iso: 'SS', name: 'Soudan du Sud', dialCode: '211', trunkPrefix: '0' },
  { iso: 'ER', name: 'Érythrée', dialCode: '291' },
  { iso: 'DJ', name: 'Djibouti', dialCode: '253' },
  { iso: 'ET', name: 'Éthiopie', dialCode: '251', trunkPrefix: '0' },
  { iso: 'SO', name: 'Somalie', dialCode: '252' },
  { iso: 'KE', name: 'Kenya', dialCode: '254', trunkPrefix: '0' },
  { iso: 'UG', name: 'Ouganda', dialCode: '256', trunkPrefix: '0' },
  { iso: 'TZ', name: 'Tanzanie', dialCode: '255', trunkPrefix: '0' },
  { iso: 'RW', name: 'Rwanda', dialCode: '250', trunkPrefix: '0' },
  { iso: 'BI', name: 'Burundi', dialCode: '257', trunkPrefix: '0' },
  { iso: 'MZ', name: 'Mozambique', dialCode: '258', trunkPrefix: '0' },
  { iso: 'MG', name: 'Madagascar', dialCode: '261', trunkPrefix: '0' },
  { iso: 'MU', name: 'Maurice', dialCode: '230' },
  { iso: 'SC', name: 'Seychelles', dialCode: '248' },
  { iso: 'KM', name: 'Comores', dialCode: '269' },
  { iso: 'ZA', name: 'Afrique du Sud', dialCode: '27', trunkPrefix: '0' },
  { iso: 'NA', name: 'Namibie', dialCode: '264', trunkPrefix: '0' },
  { iso: 'BW', name: 'Botswana', dialCode: '267', trunkPrefix: '0' },
  { iso: 'ZW', name: 'Zimbabwe', dialCode: '263', trunkPrefix: '0' },
  { iso: 'ZM', name: 'Zambie', dialCode: '260', trunkPrefix: '0' },
  { iso: 'MW', name: 'Malawi', dialCode: '265', trunkPrefix: '0' },
  { iso: 'AO', name: 'Angola', dialCode: '244', trunkPrefix: '0' },
  { iso: 'LS', name: 'Lesotho', dialCode: '266', trunkPrefix: '0' },
  { iso: 'SZ', name: 'Eswatini', dialCode: '268', trunkPrefix: '0' },
  { iso: 'GM', name: 'Gambie', dialCode: '220' },
  { iso: 'US', name: 'États-Unis', dialCode: '1' },
  { iso: 'CA', name: 'Canada', dialCode: '1' },
  { iso: 'MX', name: 'Mexique', dialCode: '52', trunkPrefix: '0' },
  { iso: 'BR', name: 'Brésil', dialCode: '55', trunkPrefix: '0' },
  { iso: 'AR', name: 'Argentine', dialCode: '54', trunkPrefix: '0' },
  { iso: 'CL', name: 'Chili', dialCode: '56', trunkPrefix: '0' },
  { iso: 'CO', name: 'Colombie', dialCode: '57', trunkPrefix: '0' },
  { iso: 'PE', name: 'Pérou', dialCode: '51', trunkPrefix: '0' },
  { iso: 'VE', name: 'Venezuela', dialCode: '58', trunkPrefix: '0' },
  { iso: 'UY', name: 'Uruguay', dialCode: '598', trunkPrefix: '0' },
  { iso: 'EC', name: 'Équateur', dialCode: '593', trunkPrefix: '0' },
  { iso: 'BO', name: 'Bolivie', dialCode: '591', trunkPrefix: '0' },
  { iso: 'PY', name: 'Paraguay', dialCode: '595', trunkPrefix: '0' },
  { iso: 'CR', name: 'Costa Rica', dialCode: '506' },
  { iso: 'PA', name: 'Panama', dialCode: '507' },
  { iso: 'CU', name: 'Cuba', dialCode: '53', trunkPrefix: '0' },
  { iso: 'DO', name: 'République dominicaine', dialCode: '1' },
  { iso: 'HT', name: 'Haïti', dialCode: '509' },
  { iso: 'JM', name: 'Jamaïque', dialCode: '1' },
  { iso: 'BS', name: 'Bahamas', dialCode: '1' },
  { iso: 'BB', name: 'Barbade', dialCode: '1' },
  { iso: 'TT', name: 'Trinité-et-Tobago', dialCode: '1' },
  { iso: 'BZ', name: 'Belize', dialCode: '501' },
  { iso: 'GT', name: 'Guatemala', dialCode: '502' },
  { iso: 'SV', name: 'Salvador', dialCode: '503' },
  { iso: 'HN', name: 'Honduras', dialCode: '504' },
  { iso: 'NI', name: 'Nicaragua', dialCode: '505' },
  { iso: 'FR', name: 'France', dialCode: '33', trunkPrefix: '0' },
  { iso: 'BE', name: 'Belgique', dialCode: '32', trunkPrefix: '0' },
  { iso: 'CH', name: 'Suisse', dialCode: '41', trunkPrefix: '0' },
  { iso: 'LU', name: 'Luxembourg', dialCode: '352' },
  { iso: 'DE', name: 'Allemagne', dialCode: '49', trunkPrefix: '0' },
  { iso: 'GB', name: 'Royaume-Uni', dialCode: '44', trunkPrefix: '0' },
  { iso: 'IE', name: 'Irlande', dialCode: '353', trunkPrefix: '0' },
  { iso: 'ES', name: 'Espagne', dialCode: '34' },
  { iso: 'PT', name: 'Portugal', dialCode: '351' },
  { iso: 'IT', name: 'Italie', dialCode: '39' },
  { iso: 'NL', name: 'Pays-Bas', dialCode: '31', trunkPrefix: '0' },
  { iso: 'MC', name: 'Monaco', dialCode: '377' },
  { iso: 'AD', name: 'Andorre', dialCode: '376' },
  { iso: 'AT', name: 'Autriche', dialCode: '43', trunkPrefix: '0' },
  { iso: 'DK', name: 'Danemark', dialCode: '45' },
  { iso: 'SE', name: 'Suède', dialCode: '46', trunkPrefix: '0' },
  { iso: 'NO', name: 'Norvège', dialCode: '47', trunkPrefix: '0' },
  { iso: 'FI', name: 'Finlande', dialCode: '358', trunkPrefix: '0' },
  { iso: 'IS', name: 'Islande', dialCode: '354' },
  { iso: 'GR', name: 'Grèce', dialCode: '30' },
  { iso: 'TR', name: 'Turquie', dialCode: '90', trunkPrefix: '0' },
  { iso: 'PL', name: 'Pologne', dialCode: '48' },
  { iso: 'CZ', name: 'Tchéquie', dialCode: '420' },
  { iso: 'SK', name: 'Slovaquie', dialCode: '421' },
  { iso: 'HU', name: 'Hongrie', dialCode: '36', trunkPrefix: '06' },
  { iso: 'RO', name: 'Roumanie', dialCode: '40', trunkPrefix: '0' },
  { iso: 'BG', name: 'Bulgarie', dialCode: '359', trunkPrefix: '0' },
  { iso: 'HR', name: 'Croatie', dialCode: '385', trunkPrefix: '0' },
  { iso: 'SI', name: 'Slovénie', dialCode: '386', trunkPrefix: '0' },
  { iso: 'UA', name: 'Ukraine', dialCode: '380', trunkPrefix: '0' },
  { iso: 'RU', name: 'Russie', dialCode: '7', trunkPrefix: '8' },
  { iso: 'AL', name: 'Albanie', dialCode: '355', trunkPrefix: '0' },
  { iso: 'BA', name: 'Bosnie-Herzégovine', dialCode: '387', trunkPrefix: '0' },
  { iso: 'ME', name: 'Monténégro', dialCode: '382', trunkPrefix: '0' },
  { iso: 'RS', name: 'Serbie', dialCode: '381', trunkPrefix: '0' },
  { iso: 'MK', name: 'Macédoine du Nord', dialCode: '389', trunkPrefix: '0' },
  { iso: 'BY', name: 'Biélorussie', dialCode: '375', trunkPrefix: '8' },
  { iso: 'MD', name: 'Moldavie', dialCode: '373', trunkPrefix: '0' },
  { iso: 'LT', name: 'Lituanie', dialCode: '370', trunkPrefix: '8' },
  { iso: 'LV', name: 'Lettonie', dialCode: '371', trunkPrefix: '0' },
  { iso: 'EE', name: 'Estonie', dialCode: '372', trunkPrefix: '0' },
  { iso: 'CY', name: 'Chypre', dialCode: '357' },
  { iso: 'MT', name: 'Malte', dialCode: '356' },
  { iso: 'LI', name: 'Liechtenstein', dialCode: '423' },
  { iso: 'SM', name: 'Saint-Marin', dialCode: '378' },
  { iso: 'IL', name: 'Israël', dialCode: '972', trunkPrefix: '0' },
  { iso: 'SA', name: 'Arabie saoudite', dialCode: '966', trunkPrefix: '0' },
  { iso: 'AE', name: 'Émirats arabes unis', dialCode: '971', trunkPrefix: '0' },
  { iso: 'QA', name: 'Qatar', dialCode: '974' },
  { iso: 'KW', name: 'Koweït', dialCode: '965' },
  { iso: 'BH', name: 'Bahreïn', dialCode: '973' },
  { iso: 'OM', name: 'Oman', dialCode: '968' },
  { iso: 'IN', name: 'Inde', dialCode: '91', trunkPrefix: '0' },
  { iso: 'PK', name: 'Pakistan', dialCode: '92', trunkPrefix: '0' },
  { iso: 'AF', name: 'Afghanistan', dialCode: '93', trunkPrefix: '0' },
  { iso: 'LK', name: 'Sri Lanka', dialCode: '94', trunkPrefix: '0' },
  { iso: 'MM', name: 'Myanmar', dialCode: '95', trunkPrefix: '0' },
  { iso: 'IR', name: 'Iran', dialCode: '98', trunkPrefix: '0' },
  { iso: 'IQ', name: 'Irak', dialCode: '964', trunkPrefix: '0' },
  { iso: 'SY', name: 'Syrie', dialCode: '963', trunkPrefix: '0' },
  { iso: 'LB', name: 'Liban', dialCode: '961', trunkPrefix: '0' },
  { iso: 'JO', name: 'Jordanie', dialCode: '962', trunkPrefix: '0' },
  { iso: 'YE', name: 'Yémen', dialCode: '967', trunkPrefix: '0' },
  { iso: 'NP', name: 'Népal', dialCode: '977', trunkPrefix: '0' },
  { iso: 'BT', name: 'Bhoutan', dialCode: '975', trunkPrefix: '0' },
  { iso: 'MV', name: 'Maldives', dialCode: '960' },
  { iso: 'KH', name: 'Cambodge', dialCode: '855', trunkPrefix: '0' },
  { iso: 'LA', name: 'Laos', dialCode: '856', trunkPrefix: '0' },
  { iso: 'BN', name: 'Brunei', dialCode: '673' },
  { iso: 'MN', name: 'Mongolie', dialCode: '976', trunkPrefix: '0' },
  { iso: 'GE', name: 'Géorgie', dialCode: '995', trunkPrefix: '0' },
  { iso: 'AM', name: 'Arménie', dialCode: '374', trunkPrefix: '0' },
  { iso: 'AZ', name: 'Azerbaïdjan', dialCode: '994', trunkPrefix: '0' },
  { iso: 'BD', name: 'Bangladesh', dialCode: '880', trunkPrefix: '0' },
  { iso: 'CN', name: 'Chine', dialCode: '86', trunkPrefix: '0' },
  { iso: 'JP', name: 'Japon', dialCode: '81', trunkPrefix: '0' },
  { iso: 'KR', name: 'Corée du Sud', dialCode: '82', trunkPrefix: '0' },
  { iso: 'TH', name: 'Thaïlande', dialCode: '66', trunkPrefix: '0' },
  { iso: 'VN', name: 'Vietnam', dialCode: '84', trunkPrefix: '0' },
  { iso: 'MY', name: 'Malaisie', dialCode: '60', trunkPrefix: '0' },
  { iso: 'SG', name: 'Singapour', dialCode: '65' },
  { iso: 'ID', name: 'Indonésie', dialCode: '62', trunkPrefix: '0' },
  { iso: 'PH', name: 'Philippines', dialCode: '63', trunkPrefix: '0' },
  { iso: 'HK', name: 'Hong Kong', dialCode: '852' },
  { iso: 'TW', name: 'Taïwan', dialCode: '886', trunkPrefix: '0' },
  { iso: 'AU', name: 'Australie', dialCode: '61', trunkPrefix: '0' },
  { iso: 'NZ', name: 'Nouvelle-Zélande', dialCode: '64', trunkPrefix: '0' },
  { iso: 'PG', name: 'Papouasie-Nouvelle-Guinée', dialCode: '675' },
  { iso: 'SB', name: 'Îles Salomon', dialCode: '677' },
  { iso: 'VU', name: 'Vanuatu', dialCode: '678' },
  { iso: 'FJ', name: 'Fidji', dialCode: '679' },
  { iso: 'PW', name: 'Palaos', dialCode: '680' },
  { iso: 'TO', name: 'Tonga', dialCode: '676' },
  { iso: 'WS', name: 'Samoa', dialCode: '685' },
  { iso: 'FM', name: 'Micronésie', dialCode: '691' },
  { iso: 'MH', name: 'Îles Marshall', dialCode: '692' },
  { iso: 'KI', name: 'Kiribati', dialCode: '686' },
  { iso: 'TV', name: 'Tuvalu', dialCode: '688' },
  { iso: 'NR', name: 'Nauru', dialCode: '674' },
];

function splitInternationalPhone(value: string): { country?: CountryCallingCode; national: string } {
  const digits = value.replace(/\D/g, '');
  const candidates = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  const country = candidates.find((item) => digits.startsWith(item.dialCode));
  return country
    ? { country, national: digits.slice(country.dialCode.length) }
    : { national: digits };
}

function toInternational(country: CountryCallingCode, nationalInput: string): string {
  let national = nationalInput.replace(/\D/g, '');
  if (country.trunkPrefix && national.startsWith(country.trunkPrefix)) {
    national = national.slice(country.trunkPrefix.length);
  }
  return national ? `+${country.dialCode}${national}` : '';
}

type PhoneNumberInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  className?: string;
};

export const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  id,
  value,
  onChange,
  required = false,
  autoComplete = 'tel',
  placeholder = '77 00 11 22',
  className = '',
}) => {
  const [countryIso, setCountryIso] = useState('GA');
  const country = useMemo(() => COUNTRIES.find((item) => item.iso === countryIso) || COUNTRIES[0], [countryIso]);

  useEffect(() => {
    if (!value) return;
    const parsed = splitInternationalPhone(value);
    // Keep the chosen country when codes are shared (for example +1).
    if (parsed.country && parsed.country.dialCode !== country.dialCode) {
      setCountryIso(parsed.country.iso);
    }
  }, [value, country.dialCode]);

  const parsedValue = splitInternationalPhone(value);
  const nationalValue = parsedValue.national;
  const displayValue = country.trunkPrefix && nationalValue
    ? `${country.trunkPrefix}${nationalValue}`
    : nationalValue;

  const handleCountryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = COUNTRIES.find((item) => item.iso === event.target.value);
    if (!selected) return;
    setCountryIso(selected.iso);
    onChange(toInternational(selected, nationalValue));
  };

  const handleNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const entered = event.target.value.trim();
    if (entered.startsWith('+') || entered.startsWith('00')) {
      const parsed = splitInternationalPhone(entered.startsWith('00') ? entered.slice(2) : entered);
      if (parsed.country) {
        setCountryIso(parsed.country.iso);
        onChange(toInternational(parsed.country, parsed.national));
        return;
      }
    }
    onChange(toInternational(country, entered));
  };

  return (
    <div className={`flex min-w-0 rounded-xl border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-[#0d44e8] ${className}`}>
      <select
        aria-label="Pays et indicatif téléphonique"
        value={country.iso}
        onChange={handleCountryChange}
        className="max-w-[44%] rounded-l-xl border-0 border-r border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700 outline-none"
      >
        {COUNTRIES.map((item) => (
          <option key={item.iso} value={item.iso}>{item.name} (+{item.dialCode})</option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        required={required}
        autoComplete={autoComplete}
        inputMode="tel"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleNumberChange}
        className="min-w-0 flex-1 rounded-r-xl border-0 bg-transparent px-3 py-2 text-xs outline-none"
      />
    </div>
  );
};
