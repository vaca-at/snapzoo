// 동물 왕국 설정: 이름 · 등급 · 가격은 모두 이 파일 한 곳에서 바꿔요 (PLAN.md 4~6번)

// 등급: 사진 상금(처음 찍을 때) · 나타나는 방식
// appear: 'always' 늘 있어요 / 'timed' 가끔 나타났다 사라져요 (every 초마다 한 번쯤, stay 초 동안)
export const RARITY = {
  common:   { name: '일반', color: '#ffffff', ink: '#24342b', prize: 50,     appear: 'always', count: 3 },
  uncommon: { name: '드문', color: '#c8f0d4', ink: '#1f5c34', prize: 300,    appear: 'always', count: 2 },
  rare:     { name: '희귀', color: '#cfe3ff', ink: '#1d4f8f', prize: 1000,   appear: 'timed', every: 50,  stay: 50, first: 12 },
  legend:   { name: '전설', color: '#ffe0b0', ink: '#8a4b00', prize: 10000,  appear: 'timed', every: 200, stay: 45, first: 45 },
  mythic:   { name: '신화', color: '#ffc9d4', ink: '#9a1f3d', prize: 80000,  appear: 'timed', every: 600, stay: 40, first: 120 },
};
export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'legend', 'mythic'];

// 별에 따라 받는 상금 비율 (별 3개면 그대로, 2개 3/4, 1개 절반) · 최고 사진을 바꾸면 10%
export const STAR_RATE = { 1: 0.5, 2: 0.75, 3: 1 };
export const BEST_RATE = 0.1;

// 초당 포인트: 누구나 1초에 1 (도감을 많이 모아도 그대로 · 빈부격차가 벌어지지 않게) · 하루 55분까지, 화면을 보고 있을 때만
export const PER_SEC_BASE = 1;
export const DAILY_SECONDS = 55 * 60;

// 구역: ride 는 타는 것, ticket 은 필요한 표 (없으면 무료)
export const ZONES = {
  station: { name: '정거장 대기실', icon: '🚏' },
  jungle:  { name: '정글', icon: '🌴', ride: 'bus',  ticket: null },
  savanna: { name: '초원', icon: '🦁', ride: 'bus',  ticket: 'bus' },
  desert:  { name: '사막', icon: '🏜️', ride: 'bus',  ticket: 'bus' },
  beach:   { name: '바닷가', icon: '🏖️', ride: 'boat', ticket: 'boat' },
  deep:    { name: '깊은 바다', icon: '🌊', ride: 'boat', ticket: 'boat' },
};
export const ZONE_ORDER = ['jungle', 'savanna', 'desert', 'beach', 'deep'];

// 표: 한 번 사면 계속 타는 정기권
export const TICKETS = [
  { id: 'bus',  icon: '🚌', name: '버스표', price: 350,  desc: '초원 · 사막에 갈 수 있어요 (정글은 무료)' },
  { id: 'boat', icon: '⛵', name: '배표',   price: 1000, desc: '바닷가 · 깊은 바다에 갈 수 있어요' },
];

// 동물 26종 (아이 등급표 그대로). model 은 js/animals.js 의 모양 이름
// act: 특별한 순간 이름, swim: 물속에서 헤엄 (높이), shy: 가까이 가면 도망가요
// photo: 도감에 열릴 진짜 동물 사진은 js/dexphotos.js (같은 id)
// night: 밤(저녁 7시 ~ 새벽 6시)에만 나와요
export const ANIMALS = [
  // 🌴 정글
  { id: 'frog',      name: '개구리',       zone: 'jungle',  rarity: 'common',   model: 'frog',      act: '폴짝 점프',      desc: '비 오는 숲에서 개굴개굴 노래해요.' },
  { id: 'snake',     name: '뱀',           zone: 'jungle',  rarity: 'common',   model: 'snake',     act: '혀 날름',        desc: '다리 없이 스르륵 미끄러지듯 다녀요.' },
  { id: 'sloth',     name: '나무늘보',     zone: 'jungle',  rarity: 'uncommon', model: 'sloth',     act: '느린 기지개',    desc: '하루에 20시간 가까이 자는 느림보예요.' },
  { id: 'toucan',    name: '토코투칸',     zone: 'jungle',  rarity: 'rare',     model: 'toucan',    act: '날갯짓',         desc: '몸보다 큰 주황 부리로 열매를 따 먹어요.' },
  { id: 'orangutan', name: '오랑우탄',     zone: 'jungle',  rarity: 'mythic',   model: 'orangutan', act: '가슴 두드리기',  desc: '도구를 쓸 줄 아는 똑똑한 숲의 사람이에요.' },
  // 🦁 초원
  { id: 'capybara',  name: '카피바라',     zone: 'savanna', rarity: 'common',   model: 'capybara',  act: '꾸벅 졸기',      desc: '세상에서 가장 큰 쥐 친구, 아주 느긋해요.' },
  { id: 'hyena',     name: '하이에나',     zone: 'savanna', rarity: 'uncommon', model: 'hyena',     act: '깔깔 웃기',      desc: '웃음소리 같은 울음으로 친구를 불러요.' },
  { id: 'lion',      name: '사자',         zone: 'savanna', rarity: 'rare',     model: 'lion',      act: '어흥!',          desc: '무리를 지어 사는 초원의 왕이에요.' },
  { id: 'cheetah',   name: '치타',         zone: 'savanna', rarity: 'rare',     model: 'cheetah',   act: '전력 질주',      desc: '땅 위에서 가장 빠르게 달리는 동물이에요.', shy: true },
  { id: 'leopard',   name: '표범',         zone: 'savanna', rarity: 'rare',     model: 'leopard',   act: '꼬리 살랑',      desc: '나무 위에 올라가 쉬는 걸 좋아해요.' },
  // 🏜️ 사막
  { id: 'thornydevil', name: '가시도마뱀', zone: 'desert',  rarity: 'uncommon', model: 'thornydevil', act: '가시 세우기',  desc: '온몸의 가시로 이슬을 모아 마셔요.' },
  { id: 'rattlesnake', name: '방울뱀',     zone: 'desert',  rarity: 'uncommon', model: 'rattlesnake', act: '방울 흔들기',  desc: '꼬리 방울을 흔들어 "다가오지 마!" 해요.' },
  { id: 'camel',     name: '낙타',         zone: 'desert',  rarity: 'uncommon', model: 'camel',     act: '쩝쩝 되새김',    desc: '등의 혹에 지방을 모아 오래 버텨요.' },
  { id: 'kangaroorat', name: '캥거루쥐',   zone: 'desert',  rarity: 'rare',     model: 'kangaroorat', act: '깡충 높이뛰기', desc: '물을 거의 마시지 않고도 살아요.', shy: true },
  { id: 'meerkat',   name: '미어캣',       zone: 'desert',  rarity: 'rare',     model: 'meerkat',   act: '벌떡 망보기',    desc: '두 발로 서서 친구들을 지켜 줘요.' },
  { id: 'fennec',    name: '사막여우',     zone: 'desert',  rarity: 'mythic',   model: 'fennec',    act: '큰 귀 쫑긋',     desc: '커다란 귀로 열을 식히고 소리를 들어요.', shy: true },
  // 🏖️ 바닷가
  { id: 'redcrab',   name: '홍게',         zone: 'beach',   rarity: 'common',   model: 'crab',      act: '집게 번쩍',      desc: '옆으로 걷는 빨간 게예요.' },
  { id: 'sardine',   name: '정어리',       zone: 'beach',   rarity: 'common',   model: 'sardine',   act: '반짝 회전',      desc: '수천 마리가 떼 지어 헤엄쳐요.', swim: 0.9 },
  { id: 'flounder',  name: '도다리',       zone: 'beach',   rarity: 'uncommon', model: 'flounder',  act: '모래 털기',      desc: '두 눈이 한쪽에 몰려 있는 납작한 물고기예요.', swim: 0.25 },
  { id: 'seaturtle', name: '푸른바다거북', zone: 'beach',   rarity: 'rare',     model: 'turtle',    act: '지느러미 인사',  desc: '바다풀을 먹고 아주 오래 살아요.', swim: 0.8 },
  { id: 'lemonshark', name: '레몬상어',    zone: 'beach',   rarity: 'rare',     model: 'shark',     act: '빙글 돌기',      desc: '몸이 레몬처럼 노르스름한 상어예요.', swim: 1.1 },
  // 🌊 깊은 바다
  { id: 'anglerfish', name: '초롱아귀',    zone: 'deep',    rarity: 'legend',   model: 'angler',    act: '초롱 반짝',      desc: '머리의 불빛으로 먹이를 꾀어요.', swim: 1.4 },
  { id: 'dragonfish', name: '드래곤피쉬',  zone: 'deep',    rarity: 'legend',   model: 'dragonfish', act: '빛 수염 흔들기', desc: '깜깜한 바다에서 스스로 빛을 내요.', swim: 2.0 },
  { id: 'oarfish',   name: '산갈치',       zone: 'deep',    rarity: 'legend',   model: 'oarfish',   act: '물결 춤',        desc: '몸길이가 몇 미터나 되는 은빛 물고기예요.', swim: 2.4 },
  { id: 'clione',    name: '클리오네',     zone: 'deep',    rarity: 'legend',   model: 'clione',    act: '날개 팔랑',      desc: '"바다의 천사"라고 불리는 작은 고둥이에요.', swim: 1.8 },
  { id: 'dumbo',     name: '덤보문어',     zone: 'deep',    rarity: 'mythic',   model: 'dumbo',     act: '귀 지느러미 파닥', desc: '코끼리 귀 같은 지느러미로 헤엄쳐요.', swim: 1.6 },
  // 🌊 깊은 바다 25종 더 (실제 심해 동물). count: 한 번에 몇 마리 (깊은 바다는 넓게 흩어져 있게 1~2마리)
  { id: 'lanternfish', name: '샛비늘치',     zone: 'deep', rarity: 'common',   model: 'lanternfish', act: '빛 점 반짝',    desc: '몸의 빛 점으로 신호를 보내요. 밤마다 위로 올라와요.', swim: 1.6, count: 2 },
  { id: 'krill',     name: '크릴',           zone: 'deep', rarity: 'common',   model: 'krill',      act: '떼로 빙글',      desc: '고래가 즐겨 먹는 작은 새우 떼예요.', swim: 1.2, count: 1 },
  { id: 'combjelly', name: '빗해파리',       zone: 'deep', rarity: 'common',   model: 'combjelly',  act: '무지개 줄 반짝',  desc: '몸의 빗줄이 무지개처럼 반짝여요.', swim: 1.0, count: 1 },
  { id: 'redshrimp', name: '심해 붉은새우',  zone: 'deep', rarity: 'common',   model: 'redshrimp',  act: '꼬리 튕기기',    desc: '깊은 곳에선 빨간색이 보이지 않아 숨기 좋아요.', count: 2 },
  { id: 'hatchetfish', name: '손도끼고기',   zone: 'deep', rarity: 'common',   model: 'hatchetfish', act: '은빛 반짝',     desc: '손도끼처럼 납작하고 배가 빛나요.', swim: 1.4, count: 2 },
  { id: 'snailfish', name: '심해 꼼치',      zone: 'deep', rarity: 'common',   model: 'snailfish',  act: '살랑 헤엄',      desc: '가장 깊은 바다에 사는 물고기 중 하나예요.', swim: 0.6, count: 1 },
  { id: 'tubeworm',  name: '관벌레',         zone: 'deep', rarity: 'common',   model: 'tubeworm',   act: '쏙 숨기',        desc: '뜨거운 물이 솟는 곳에 모여 살아요.', count: 1 },
  { id: 'seapig',    name: '바다돼지',       zone: 'deep', rarity: 'uncommon', model: 'seapig',     act: '몸 부풀리기',    desc: '바닥을 걸어 다니는 분홍 해삼이에요.', count: 1 },
  { id: 'isopod',    name: '대왕등각류',     zone: 'deep', rarity: 'uncommon', model: 'isopod',     act: '몸 말기',        desc: '공벌레의 친척인데 크기가 손바닥만 해요.', count: 1 },
  { id: 'glasssquid', name: '유리오징어',    zone: 'deep', rarity: 'uncommon', model: 'glasssquid', act: '투명 몸 반짝',    desc: '몸이 유리처럼 투명해 숨기 좋아요.', swim: 1.5, count: 1 },
  { id: 'fangtooth', name: '귀신고기',       zone: 'deep', rarity: 'uncommon', model: 'fangtooth',  act: '이빨 딱딱',      desc: '몸에 비해 이빨이 아주 커요.', swim: 1.2, count: 1 },
  { id: 'atolla',    name: '아톨라해파리',   zone: 'deep', rarity: 'uncommon', model: 'atolla',     act: '파란 빛 고리',    desc: '위험하면 파란 빛을 빙글빙글 돌려요.', swim: 1.3, count: 1 },
  { id: 'yeticrab',  name: '예티게',         zone: 'deep', rarity: 'uncommon', model: 'yeticrab',   act: '털 집게 흔들기',  desc: '집게에 털이 북슬북슬한 하얀 게예요.', count: 1 },
  { id: 'seaspider', name: '바다거미',       zone: 'deep', rarity: 'uncommon', model: 'seaspider',  act: '긴 다리 걷기',    desc: '몸보다 다리가 훨씬 긴 바다 생물이에요.', count: 1 },
  { id: 'blobfish',  name: '블롭피쉬',       zone: 'deep', rarity: 'rare',     model: 'blobfish',   act: '말랑 출렁',      desc: '깊은 바다에선 멀쩡한 물고기 모양이에요.', swim: 0.3 },
  { id: 'vampsquid', name: '흡혈오징어',     zone: 'deep', rarity: 'rare',     model: 'vampsquid',  act: '망토 뒤집기',    desc: '이름과 달리 바다 눈송이를 먹어요.', swim: 1.4 },
  { id: 'viperfish', name: '독사고기',       zone: 'deep', rarity: 'rare',     model: 'viperfish',  act: '긴 이빨 번쩍',    desc: '바늘 같은 이빨이 입 밖으로 나와 있어요.', swim: 1.6 },
  { id: 'gulpereel', name: '펠리컨장어',     zone: 'deep', rarity: 'rare',     model: 'gulpereel',  act: '큰 입 쩍',       desc: '입을 풍선처럼 크게 벌려요.', swim: 1.8 },
  { id: 'chimaera',  name: '은상어',         zone: 'deep', rarity: 'rare',     model: 'chimaera',   act: '날개 지느러미',   desc: '상어의 먼 친척이에요. 유령상어라고도 해요.', swim: 0.9 },
  { id: 'tripodfish', name: '삼각다리고기',  zone: 'deep', rarity: 'rare',     model: 'tripodfish', act: '세 다리로 서기',  desc: '긴 지느러미 세 개로 바닥에 서서 기다려요.' },
  { id: 'casper',    name: '유령문어',       zone: 'deep', rarity: 'rare',     model: 'casper',     act: '둥실 떠오르기',   desc: '하얗고 말랑한 아주 깊은 바다의 문어예요.' },
  { id: 'barreleye', name: '통안어',         zone: 'deep', rarity: 'legend',   model: 'barreleye',  act: '눈 굴리기',      desc: '투명한 머리 안에서 초록 눈이 위를 봐요.', swim: 1.5 },
  { id: 'goblinshark', name: '마귀상어',     zone: 'deep', rarity: 'legend',   model: 'goblinshark', act: '턱 쑥 내밀기',   desc: '먹이를 잡을 때 턱이 앞으로 튀어나와요.', swim: 1.3 },
  { id: 'frilledshark', name: '주름상어',    zone: 'deep', rarity: 'legend',   model: 'frilledshark', act: '뱀처럼 헤엄',    desc: '아주 오래전 모습 그대로인 상어예요.', swim: 1.1 },
  { id: 'giantsquid', name: '대왕오징어',    zone: 'deep', rarity: 'mythic',   model: 'giantsquid', act: '긴 팔 뻗기',     desc: '눈이 축구공만 한 거대한 오징어예요.', swim: 2.2 },
  // 🌙 밤에만 나오는 동물 (실제 시간으로 저녁 7시 ~ 새벽 6시)
  { id: 'nightmonkey', name: '올빼미원숭이', zone: 'jungle',  rarity: 'rare',     model: 'nightmonkey', act: '큰 눈 깜빡',  desc: '세상에서 하나뿐인 밤에 다니는 원숭이예요.', night: true },
  { id: 'aardvark',  name: '땅돼지',       zone: 'savanna', rarity: 'rare',     model: 'aardvark',  act: '흙 파기',        desc: '밤에 긴 혀로 개미를 잔뜩 먹어요.', night: true },
  { id: 'hedgehog',  name: '사막고슴도치', zone: 'desert',  rarity: 'rare',     model: 'hedgehog',  act: '가시 공 되기',   desc: '더운 낮엔 자고 시원한 밤에 나와요.', night: true },
  { id: 'ghostcrab', name: '유령게',       zone: 'beach',   rarity: 'rare',     model: 'ghostcrab', act: '쌩 달리기',      desc: '모래색 몸으로 밤 바닷가를 재빨리 달려요.', night: true },
];

// 상점 카메라 6대 (아이가 지은 이름 · 색 · 가격)
// boost: 그 등급이 더 자주 나와요 (나타나는 간격에 곱해요), alert: 반짝이기 직전 "곧!" 알림, prizeX: 상금 배수
export const CAMERAS = [
  { id: 'copper',   name: '녹색 구리 렌즈',   color: '#ffffff', price: 0,      zoom: 2,   effect: '줌 2배 · 처음 들고 시작' },
  { id: 'brass',    name: '황동 프리즘',      color: '#3fbf6a', price: 500,    zoom: 2.5, effect: '줌 2.5배' },
  { id: 'obsidian', name: '옵시디언 셔터',    color: '#3b82f6', price: 3000,   zoom: 3,   effect: '줌 3배 · 희귀 동물이 조금 더 자주', boost: { rare: 0.8 } },
  { id: 'astral',   name: '아스트랄 옵틱스',  color: '#8b5cf6', price: 50000,  zoom: 3.5, effect: '줌 3.5배 · 반짝이기 직전 "곧!" 알림', boost: { rare: 0.8 }, alert: true },
  { id: 'secret',   name: '시크릿 라이트',    color: '#f97316', price: 150000, zoom: 4,   effect: '줌 4배 · 전설 동물이 더 자주', boost: { rare: 0.8, legend: 0.7 }, alert: true },
  { id: 'akasha',   name: '아카샤 레코드',    color: '#ef4444', price: 500000, zoom: 4,   effect: '줌 4배 · 신화 동물이 더 자주 · 사진 상금 2배', boost: { rare: 0.8, legend: 0.7, mythic: 0.6 }, alert: true, prizeX: 2 },
];

// 꾸미기 (모양만 바뀌고 점수 · 코인에는 영향 없음)
// 내 모습: 몸 2가지(둘 다 처음부터 가져요, 언제든 바꿔요) · 성별 · 머리 · 옷 · 아이템
// price 0 은 처음부터 가진 기본, 나머지는 상점 '옷 가게'에서 사요. 꾸미기는 점수 · 코인에 영향 없음
export const BODIES = [
  { id: 'block', icon: '🧱', name: '네모 탐험가' },   // 시안 1번
  { id: 'bean',  icon: '🫘', name: '콩알 탐험가' },   // 시안 8번
];
export const GENDERS = [
  { id: 'm', icon: '👦', name: '남자' },
  { id: 'f', icon: '👧', name: '여자' },
];
export const LOOKS = {
  // 머리는 네모 탐험가만 (콩알은 남자 새싹 · 여자 리본)
  hair: [
    { id: 'short',    icon: '💇', name: '짧은 머리',   price: 0 },
    { id: 'long',     icon: '💇‍♀️', name: '긴 머리',     price: 0 },
    { id: 'ponytail', icon: '🎀', name: '포니테일',    price: 300 },
    { id: 'curly',    icon: '🌀', name: '곱슬머리',    price: 300 },
    { id: 'braid',    icon: '🪢', name: '땋은 머리',   price: 500 },
  ],
  outfit: [
    { id: 'explorer', icon: '🧭', name: '탐험복',       price: 0 },     // 시안 1번 조끼
    { id: 'tee',      icon: '👕', name: '민트 티셔츠',  price: 0 },     // 시안 2번
    { id: 'overall',  icon: '👖', name: '하늘 멜빵',    price: 0 },     // 시안 4번
    { id: 'plaid',    icon: '🏕️', name: '캠핑 체크',    price: 800 },   // 시안 5번
    { id: 'raincoat', icon: '☔', name: '노란 우비',    price: 1200 },  // 시안 15번
    { id: 'wetsuit',  icon: '🤿', name: '잠수복',       price: 1500 },  // 시안 13번
    { id: 'frog',     icon: '🐸', name: '개구리 잠옷',  price: 1500 },  // 시안 14번
    { id: 'jacket',   icon: '📸', name: '사진가 재킷',  price: 2000 },
    { id: 'lion',     icon: '🦁', name: '사자 후드',    price: 3000 },  // 시안 3번
  ],
  item: [
    { id: 'hat',       icon: '🤠', name: '탐험가 모자',  price: 0 },    // 시안 2번
    { id: 'sprout',    icon: '🌱', name: '새싹 머리핀',  price: 300 },  // 시안 11번
    { id: 'compass',   icon: '🧭', name: '나침반 목걸이', price: 800 },
    { id: 'goggles',   icon: '🥽', name: '물안경',       price: 1000 }, // 시안 13번
    { id: 'bag',       icon: '🎒', name: '카메라 가방',  price: 1200 },
    { id: 'binocular', icon: '🔭', name: '쌍안경',       price: 1500 },
    { id: 'headlamp',  icon: '🔦', name: '헤드랜턴',     price: 2500 },
  ],
};
// 머리를 덮는 옷 (후드 · 우비 모자를 쓰면 머리 · 모자가 안 보여요)
export const HOODS = ['frog', 'lion', 'raincoat'];
export const LOOK_TABS = [
  { id: 'outfit', icon: '👕', name: '옷' },
  { id: 'hair', icon: '💇', name: '머리' },
  { id: 'item', icon: '🎒', name: '아이템' },
];

// 광장 아이스크림 가게 (무료, 먹는 동작의 맛 색)
export const FLAVORS = [
  { id: 'strawberry', icon: '🍓', name: '딸기',   color: '#ffb3c7' },
  { id: 'choco',      icon: '🍫', name: '초코',   color: '#8a5a3a' },
  { id: 'mint',       icon: '🌿', name: '민트',   color: '#a8ecd0' },
];

// 이름은 정해진 낱말 조합으로만 (개인정보 · 나쁜 말 걱정 없음). '000 00' 모양: 세 글자 꾸밈말 + 두 글자 동물
// 처음 들어오면 자동으로 하나 받아요. 서버(server/worker.js)도 이 목록으로 이름을 검사해요
export const NAME_A = ['용감한', '씩씩한', '느긋한', '조용한', '재빠른', '행복한', '따뜻한', '튼튼한', '꼼꼼한', '귀여운', '신나는', '똑똑한',
  '상냥한', '명랑한', '다정한', '즐거운', '활기찬', '엉뚱한', '수줍은', '포근한', '말랑한', '용맹한', '든든한', '반가운'];
export const NAME_B = ['수달', '펭귄', '토끼', '여우', '판다', '고래', '사자', '참새', '거북', '하마', '기린', '사슴',
  '오리', '치타', '낙타', '상어', '문어', '해달', '물개', '염소', '표범', '물범', '꿀벌', '나비'];

// 표정 · 동작
export const FACES = ['😊', '😆', '😮', '😍', '😴', '👍'];
export const ACTIONS = [
  { id: 'wave',     icon: '👋', name: '손 흔들기' },
  { id: 'kite',     icon: '🪁', name: '연날리기' },
  { id: 'bugs',     icon: '🦋', name: '곤충잡기' },
  { id: 'bike',     icon: '🚲', name: '자전거타기' },
  { id: 'icecream', icon: '🍦', name: '아이스크림' },
  { id: 'show',     icon: '📖', name: '도감 자랑' },
];
// 광장 동작 단추 (오른쪽, 위에서부터). 연날리기 · 자전거타기는 광장을 저절로 돌아요
export const PLAZA_ACTS = ['wave', 'show', 'kite', 'bugs', 'bike'];

// 친구와 같이 (정거장 대기실): 방 중계 서버 (server/ 폴더, Cloudflare Durable Objects)
// 서버가 아직 없거나 닿지 않으면 혼자 놀기로 그대로 동작해요.
// 시험: 주소에 ?relay=http://localhost:8787 을 붙이면 그 서버를 써요
export const RELAY_URL = 'https://snapzoo-rooms.bellachord.workers.dev';
export const SERVER_COUNT = 12;   // 서버 1~12
export const SERVER_CAP = 100;    // 서버 하나에 100명까지

// 사진 점수: 가운데 40 · 크기 30 · 특별한 순간 30
export const SCORE = { center: 40, size: 30, moment: 30 };
export const starsOf = (s) => (s >= 80 ? 3 : s >= 55 ? 2 : 1);
