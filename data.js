/*
 * 구마모토 2박 3일 경로 지도 - 데이터
 * 시각/요금/메모는 final_itinerary.md(2026-10-14)의 사실만 사용했습니다.
 * 시각은 "HH:MM" 문자열이며 app.js에서 분 단위로 변환합니다.
 *
 * 좌표 출처 (모두 조회 후 기록, 위도 경도 순)
 *  - 阿蘇くまもと空港      32.8342, 130.8590  OpenStreetMap Nominatim (nominatim.openstreetmap.org, 검색어 "阿蘇くまもと空港")
 *  - 通町筋(시덴 정류장)   32.80331, 130.70974 ja.wikipedia 「通町筋停留場」 좌표 (MediaWiki API prop=coordinates)
 *  - 加藤神社(本丸)        32.80724, 130.70518 OpenStreetMap Nominatim ("加藤神社 熊本", 본마루 소재 항목)
 *  - 熊本城                32.80606, 130.70590 ja.wikipedia 「熊本城」 32.80603,130.70590 / en.wikipedia 32.806063,130.705972
 *  - 下通(아케이드 일대)   32.80114, 130.70849 OpenStreetMap Nominatim ("下通 中央区 熊本市", type=pedestrian)
 *                          숙소는 건물이 아니라 이 아케이드 일대의 중심 좌표로만 표시
 *  - 花畑町 일대(스윙)     32.80125, 130.70556 ja.wikipedia 「花畑町停留場」 좌표. 스윙(酔ing)의 정확한 주소는 미확인이라 정류장 일대로 표시
 *  - 熊本桜町バスターミナル 32.80000, 130.70361 ja.wikipedia 「熊本桜町バスターミナル」 좌표
 *  - 草千里ヶ浜            32.88071, 131.05384 OpenStreetMap Nominatim ("草千里ヶ浜 阿蘇", attraction)
 *  - 杵島岳                32.89272, 131.05790 OpenStreetMap Nominatim ("杵島岳")
 *  - 阿蘇駅                32.93738, 131.08021 ja.wikipedia 「阿蘇駅」 좌표
 *  - 肥後大津駅(환승 지점) 32.87756, 130.86614 ja.wikipedia 「肥後大津駅」 좌표
 *  - 熊本駅                32.79000, 130.68889 ja.wikipedia 「熊本駅」 좌표
 *  - 水前寺公園停留場      32.78967, 130.73271 ja.wikipedia 「水前寺公園停留場」 좌표 (경로 중간점)
 *  - 水前寺成趣園          32.79109, 130.73459 ja.wikipedia 「水前寺成趣園」 좌표
 *  - 熊本県庁              32.78975, 130.74153 ja.wikipedia 「熊本県庁」 좌표
 * 정류장 사이 경로는 실제 도로/선로가 아니라 직선(또는 확인된 환승점 경유)으로 그린 개략선입니다.
 */
window.TRIP = {
  title: '구마모토 2박 3일',
  // CARTO basemaps는 무료 API 키가 필요합니다(https://carto.com/basemaps/apikey). 키를 넣으면 CARTO light_all/dark_all, 비우면 OpenStreetMap 표준 타일을 씁니다.
  cartoKey: '',
  stops: {
    airport:   { ko: '구마모토 공항', jp: '阿蘇くまもと空港', ll: [32.8342, 130.8590], zoom: 14 },
    tori:      { ko: '도리초스지', jp: '通町筋', ll: [32.80331, 130.70974], zoom: 16 },
    kato:      { ko: '가토 신사', jp: '加藤神社', ll: [32.80724, 130.70518], zoom: 16 },
    castle:    { ko: '구마모토성', jp: '熊本城', ll: [32.80606, 130.70590], zoom: 16 },
    lodging:   { ko: '숙소(시모토리 일대)', jp: '下通周辺', ll: [32.80114, 130.70849], zoom: 16 },
    swing:     { ko: '재즈 바 스윙', jp: '酔ing', ll: [32.80125, 130.70556], zoom: 16, areaNote: '하나바타초(花畑町) 일대' },
    sakura:    { ko: '사쿠라마치 버스터미널', jp: '熊本桜町バスターミナル', ll: [32.80000, 130.70361], zoom: 16 },
    kusasenri: { ko: '쿠사센리', jp: '草千里', ll: [32.88071, 131.05384], zoom: 14 },
    kishima:   { ko: '기시마다케', jp: '杵島岳', ll: [32.89272, 131.05790], zoom: 14 },
    aso:       { ko: '아소역', jp: '阿蘇駅', ll: [32.93738, 131.08021], zoom: 14 },
    kumaeki:   { ko: '구마모토역', jp: '熊本駅', ll: [32.79000, 130.68889], zoom: 15 },
    suizenji:  { ko: '스이젠지 조주엔', jp: '水前寺成趣園', ll: [32.79109, 130.73459], zoom: 16 },
    kencho:    { ko: '구마모토현청', jp: '熊本県庁', ll: [32.78975, 130.74153], zoom: 16 }
  },
  // 경로 중간점 (지도에 보조 점으로만 표시)
  waypoints: {
    higoozu: { ko: '히고오즈 환승', jp: '肥後大津駅', ll: [32.87756, 130.86614] },
    suizenjiStop: { ko: '스이젠지코엔 정류장', jp: '水前寺公園停留場', ll: [32.78967, 130.73271] }
  },
  // 사진 출처 (LICENSES.md와 동일). illus: 장소 자체가 아닌 분위기 참고용 사진
  photos: {
    airport:       { author: 'ブルー・プラス', lic: 'CC BY-SA 4.0' },
    tram_new:      { author: 'Futoshita Bonjin', lic: 'CC BY-SA 4.0', illus: true },
    castle_wall:   { author: '663highland', lic: 'CC BY 2.5', illus: true },
    castle_sky:    { author: 'ノボホショコロトソ', lic: 'CC BY-SA 4.0' },
    castle_night:  { author: 'くまもと急行鉄道', lic: '퍼블릭 도메인' },
    shimotori:     { author: 'Fabimaru', lic: 'CC BY-SA 3.0' },
    sax:           { author: 'Agnese Carbelli', lic: 'CC BY-SA 4.0', illus: true },
    jazz_band:     { author: 'Tomwsulcer', lic: 'CC0', illus: true },
    tram_retro:    { author: 'Sui-setz', lic: '퍼블릭 도메인', illus: true },
    kusasenri:     { author: 'Project Kei', lic: 'CC BY-SA 4.0' },
    horses:        { author: 'Raita Futo from Tokyo, Japan', lic: 'CC BY 2.0' },
    kishima:       { author: 'YOSHIFUMI OGISO', lic: 'CC BY-SA 3.0' },
    nakadake:      { author: 'Hahifuheho', lic: 'CC0' },
    aso_station:   { author: 'おりぜ～ (Orize)', lic: 'CC BY-SA 3.0' },
    suizenji:      { author: '663highland', lic: 'CC BY 2.5' },
    suizenji_fuji: { author: 'Edogang1', lic: 'CC0' },
    izakaya:       { author: 'NY066', lic: 'CC BY-SA 4.0', illus: true },
    basashi:       { author: 'Araisyohei', lic: 'CC BY-SA 4.0', illus: true },
    renkon:        { author: 'MaedaAkihiko', lic: 'CC0', illus: true }
  },
  days: [
    {
      id: 1, tab: '1일차', date: '10/17(토)', title: '성 해 질 녘 + 재즈', color: '#E85D4E',
      sunset: '17:42',
      cost: '1,400엔', costNote: '공항 리무진',
      nodes: [
        { stop: 'airport', arr: '13:50', dep: '14:30', hold: 3.4, window: '13:50 도착',
          photos: ['airport'],
          memo: '입국 수속을 마치고 3번 승강장에서 14:30 특쾌 리무진을 탑니다.' },
        { stop: 'tori', arr: '15:13', dep: '15:15', hold: 3.4, window: '15:13 도착',
          legIn: { dur: 4.2, tag: '리무진', text: '공항 리무진 특쾌(3번 승강장)', dep: '14:30', arr: '15:13', fare: '1,400엔' },
          photos: ['tram_new'],
          memo: '도리초스지에서 내립니다. 놓치면 14:40 각정(4번 승강장) 15:27 도착, 14:50 특쾌(3번) 15:33 도착.' },
        { stop: 'lodging', arr: '15:20', dep: '16:00', hold: 3.4, window: '15:20~16:00',
          legIn: { dur: 1.4, tag: '도보', text: '도보 몇 분', dep: '15:15', arr: '15:20', fare: '-' },
          photos: ['shimotori'],
          memo: '체크인하거나, 체크인 전이면 짐만 맡깁니다. 남는 시간에는 쉬거나 시모토리·가미토리 아케이드를 걷습니다.',
          notes: ['체크인 시각은 미확인.'] },
        { stop: 'kato', arr: '16:20', dep: '16:40', hold: 3.2, window: '16:20~16:40',
          legIn: { dur: 2.2, tag: '도보', text: '도보 약 20분(미확인)', dep: '16:00', arr: '16:20', fare: '-' },
          photos: ['castle_wall'],
          memo: '천수각과 우토 망루(宇土櫓)를 한 화면에 담는 구도를 노립니다.' },
        { stop: 'castle', arr: '16:40', dep: '18:35', hold: 8, window: '16:40~18:35',
          legIn: { dur: 1.8, tag: '도보', text: '도보', dep: '16:40', arr: '16:40', fare: '입장료 800엔(고등학생 이상)' },
          photos: [{ k: 'castle_sky' }, { k: 'castle_night', from: '18:00' }],
          marks: [{ at: '17:42', text: '일몰 17:42' }, { at: '18:00', text: '시로아카리(城あかり) 18:00~21:00' }],
          memo: '가을 축제 기간 9:00~21:00, 최종 입장 20:00. 17:42 일몰 뒤 18:00부터 조명·태고·고토 행사가 열립니다.',
          notes: ['공사 상황에 따라 북문(北口)으로 못 드나들 수 있으며, 그때는 남문(南口)을 씁니다.', '2026.7.28 지진으로 석벽 일부 출입 금지. 천수각 최종 입장 시각은 미확인.'] },
        { stop: 'swing', arr: '18:50', dep: '21:30', hold: 6, window: '19:00 입장 · 19:30 시작 ~ 21:30쯤',
          legIn: { dur: 2.4, tag: '도보', text: '성 남문에서 도보 약 10~15분', dep: '18:35', arr: '18:50', fare: '차지 2,000엔 + 주문' },
          photos: ['sax', 'jazz_band'],
          memo: '10/17 출연은 나카타 히로시(中田博, 테너 색소폰)·에밀리(エミリー, bs) 듀오. 저녁 식사도 여기서 합니다.',
          notes: ['정확한 주소는 미확인이라 지도에는 하나바타초(花畑町) 일대로 표시했습니다.', '22:30 이후는 일반 차지 800엔. 공연 중 촬영 가능 여부는 가게에 먼저 물어볼 것.'],
          extra: { title: '저녁 이자카야 (21:30~ 선택)', text: '시모토리(下通) 이자카야에서 바사시, 가라시렌콘, 구마 소주.', photos: ['basashi', 'renkon', 'izakaya'] } }
      ]
    },
    {
      id: 2, tab: '2일차', date: '10/18(일)', title: '아소 쿠사센리 트레킹', color: '#7FA82E',
      cost: '4,500엔', costNote: '직행버스 · 등산선 · JR · 시덴',
      nodes: [
        { stop: 'sakura', arr: '9:45', dep: '9:45', hold: 3.2, window: '9:45 출발',
          photos: ['tram_retro'],
          memo: '숙소에서 도보 약 10분(9:30 출발). 직행버스는 하루 1편입니다.',
          notes: ['구마모토역~산상 터미널 구간은 예약제(산코버스 공식, 2026-10-16 확인).'] },
        { stop: 'kusasenri', arr: '11:32', dep: '11:40', hold: 3.8, window: '11:32 도착 (아소화산박물관 앞)',
          legIn: { dur: 5, tag: '직행버스', text: '구마모토~아소산상 터미널선(熊本～阿蘇山上ターミナル線)', dep: '9:45', arr: '11:32', fare: '2,000엔' },
          photos: ['kusasenri', 'horses'],
          memo: '쿠사센리 아소화산박물관 앞(草千里阿蘇火山博物館前)에서 내려 초원을 걷고 점심을 먹습니다.' },
        { stop: 'kishima', arr: '11:40', dep: '15:30', hold: 6, window: '11:40~15:30 트레킹 · 점심',
          legIn: { dur: 2.4, tag: '도보', text: '도보', dep: '11:32', arr: '11:40', fare: '-' },
          photos: ['kishima', 'nakadake'],
          memo: '왕복 약 1시간~1시간 15분. 화구 견학은 불가하고, 산상 광장까지만 갈 수 있습니다.',
          notes: ['분화 경계 레벨 2, 화구 반경 약 1km 출입 금지(2026-10-16 기준). 당일 아침 aso-volcano.jp 확인.', '억새는 10/8 기준 아직 덜 핌(阿蘇市).'] },
        { stop: 'kusasenri', arr: '15:30', dep: '15:45', hold: 4, window: '15:30 복귀 · 15:45 등산선',
          legIn: { dur: 2.4, tag: '도보', text: '도보로 쿠사센리 복귀', dep: '15:30', arr: '15:30', fare: '-' },
          photos: ['horses'],
          memo: '아소 등산선 8편 시각이 출처마다 15:45와 16:02로 달라 15:40까지 정류장에 가 있습니다.',
          notes: ['막차 9편(16:35)을 타면 JR 16:45를 놓칩니다.'] },
        { stop: 'aso', arr: '16:13', dep: '16:45', hold: 4.2, window: '16:13~16:45',
          legIn: { dur: 3, tag: '아소 등산선', text: '쿠사센리 15:45 발 아소 등산선 8편', dep: '15:45', arr: '16:13', fare: '1,000엔' },
          photos: ['aso_station'],
          memo: '아소역 앞 우솝 동상을 보고 갑니다.' },
        { stop: 'kumaeki', arr: '18:06', dep: '18:10', hold: 4, window: '18:06 도착',
          legIn: { dur: 4.4, via: ['higoozu'], tag: 'JR 호히선', text: 'JR 호히선(豊肥本線) 보통, 히고오즈 17:29 / 17:31 환승', dep: '16:45', arr: '18:06', fare: '1,300엔(에키탄 기준)' },
          photos: [], svg: 'train', svgLabel: '사진 없음',
          memo: '438D는 매일 운전. 히고오즈 환승은 2분이며, 놓치면 17:44 발 → 18:21 도착입니다.' },
        { stop: 'lodging', arr: '18:25', dep: '18:25', hold: 5, window: '18:25쯤 시내 도착',
          legIn: { dur: 2.4, tag: '시덴', text: '구마모토역 앞 → 하나바타초·도리초스지, 시덴 A계통 약 10~15분(미확인)', dep: '18:10', arr: '18:25', fare: '200엔' },
          photos: ['shimotori'],
          memo: '2일차 교통비 4,500엔.',
          notes: ['스윙 선데이 세션(Host 마쓰자키 유미 松崎祐美 트리오, Open 18:00, 차지 2,000엔)은 1일차를 보고 결정합니다. 가면 18:30쯤 들어갑니다.'],
          extra: { title: '저녁 이자카야', text: '시모토리의 이자카야에서 저녁을 먹습니다.', photos: ['izakaya', 'basashi', 'renkon'] } }
      ]
    },
    {
      id: 3, tab: '3일차', date: '10/19(월)', title: '정원 + 루피 → 공항', color: '#4F86E8',
      cost: '약 1,600엔', costNote: '시덴 200엔 + 리무진 1,400엔 이하',
      nodes: [
        { stop: 'lodging', arr: '8:00', dep: '8:00', hold: 3, window: '8:00 체크아웃',
          photos: ['shimotori'],
          memo: '시덴 정류장(하나바타초 花畑町 또는 도리초스지)까지 걸어갑니다. 체크아웃 시각은 미확인.' },
        { stop: 'suizenji', arr: '8:35', dep: '9:35', hold: 6, window: '8:35~9:35',
          legIn: { dur: 4, via: ['suizenjiStop'], tag: '시덴', text: '시덴(겐군마치 健軍町행) 8:10~8:35, 약 20분(미확인)', dep: '8:10', arr: '8:35', fare: '200엔' },
          photos: ['suizenji', 'suizenji_fuji'],
          memo: '아침 빛의 연못과 축소판 후지산 잔디 언덕.',
          notes: ['입장료 400엔(제3자 출처, 500엔으로 올랐다는 정보도 있어 미확인)', '8:30~17:00(제3자 출처). 2026 지진 이후 운영 상태는 미확인.'] },
        { stop: 'kencho', arr: '10:00', dep: '11:31', hold: 7, window: '10:00~10:40 루피 동상 · 11:31 정류장',
          legIn: { dur: 2.6, tag: '도보', text: '도보 약 15~20분(미확인)', dep: '9:35', arr: '10:00', fare: '-' },
          photos: [], svg: 'luffy', svgLabel: '루피 동상(사진 없음)',
          memo: '현청 앞 산책로의 루피 동상과 같은 포즈로 찍습니다.',
          notes: ['11:31 리무진은 현청 앞(熊本県庁前) 정류장에서 탑니다. 10:56 편도 있습니다.'] },
        { stop: 'airport', arr: '12:02', dep: '12:02', hold: 4.5, window: '12:02 도착',
          legIn: { dur: 4.4, tag: '리무진', text: '공항 리무진 각정, 현청 앞 정류장 11:31 발', dep: '11:31', arr: '12:02', fare: '1,400엔 이하(이 정류장 출발 요금 미확인)' },
          photos: ['airport'],
          memo: '특쾌는 이 정류장에 서지 않으니 반드시 각정을 탑니다. 다음 편은 11:51 발 → 12:22 도착. 13:20까지 공항에 도착합니다.' }
      ]
    }
  ]
};
