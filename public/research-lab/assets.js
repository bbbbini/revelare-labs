window.MV_ASSETS = {
  walk: {
    src: '/api/office/research-lab/assets/walk', // operator image_gen 14:06Z, 1774x887, 4 cols x 2 rows (stepA / stepB)
    facings: ['front-left', 'front-right', 'back-left', 'back-right'], rows: 2, cw: 1774 / 4, ch: 887 / 2,
    foot: { '0,0': [207, 433], '1,0': [705, 433], '2,0': [1144, 428], '3,0': [1501, 429], '0,1': [207, 865], '1,1': [704, 864], '2,1': [1151, 865], '3,1': [1516, 865] },
    height: 408, headWidth: 218, // mean over the 8 cells (400..414 and 213..224)
  },
  seated: {
    src: '/api/office/research-lab/assets/seated', // operator image_gen 14:06Z, 2172x724, 3 cols: mid / seatA / seatB, back view facing up-right
    cols: { mid: 0, seatA: 1, seatB: 2 }, cw: 2172 / 3, ch: 724,
    foot: { mid: [500, 705], seatA: [1206, 702], seatB: [1811, 705] },
    head: { mid: [472, 11], seatA: [340, 19], seatB: [229, 21] },
    headWidth: 316, // mean of 310 / 319 / 320; generated at a larger pixel scale than the walk atlas
  },
  atlases: { furniture: '/api/office/research-lab/assets/furniture', furniture2: '/api/office/research-lab/assets/furniture2', furniture3: '/api/office/research-lab/assets/furniture3' },
  scene: {
    desk: { atlas: 'furniture', poly: [[40, 0], [860, 0], [860, 470], [700, 545], [620, 600], [530, 600], [530, 480], [40, 480]], bounds: [86, 13, 830, 579] },
    monitor: { atlas: 'furniture', rects: [[900, 10, 480, 470], [1030, 480, 350, 40]], bounds: [943, 37, 1350, 511] },
    chair: { atlas: 'furniture', rects: [[90, 470, 470, 530]], bounds: [127, 490, 522, 984],
      seat: [400, 740], // cushion surface next to the backrest, read off a 25 px grid (drafts/chairgrid.png)
      front: [ // drawn again on the front layer: backrest and the near (right) armrest with its post
        [[128, 490], [200, 505], [300, 530], [348, 548], [368, 600], [376, 650], [376, 700], [366, 740], [352, 780], [342, 815], [300, 815], [180, 775], [150, 760], [148, 700], [130, 600]],
        [[392, 660], [500, 632], [522, 650], [520, 690], [470, 705], [468, 800], [440, 815], [420, 800], [430, 719], [395, 707]],
      ] },
    shelf: { atlas: 'furniture', poly: [[620, 990], [1070, 990], [1070, 470], [850, 470], [700, 545], [620, 600]], bounds: [644, 498, 1064, 989] },
    plant: { atlas: 'furniture', rects: [[1140, 600, 380, 420]], bounds: [1166, 642, 1496, 983] },
    chairF: { atlas: 'furniture2', rects: [[60, 30, 250, 360]], bounds: [63, 43, 304, 384] },            // office chair facing +y
    monback: { atlas: 'furniture2', rects: [[425, 25, 195, 315], [620, 25, 225, 360]], bounds: [449, 37, 824, 367] }, // dual monitors, backs (screens face -y)
    bench: { atlas: 'furniture2', rects: [[885, 0, 620, 480], [1300, 480, 205, 35]], bounds: [896, 7, 1492, 510] },   // long axis x, used from +y
    stool: { atlas: 'furniture2', rects: [[90, 470, 150, 200]], bounds: [98, 476, 237, 666] },
    rack: { atlas: 'furniture2', poly: [[375, 338], [625, 338], [625, 700], [548, 742], [520, 768], [375, 768]], bounds: [387, 343, 612, 760] }, // poly: whiteboard corner excluded (dev-review F2 16:51Z), bounds v2-rack-poly-measure.json; front +y
    console: { atlas: 'furniture2', rects: [[740, 420, 170, 370]], bounds: [745, 429, 898, 781] },        // screen +y
    mtable: { atlas: 'furniture2', rects: [[990, 512, 510, 400], [990, 480, 300, 32]], bounds: [996, 490, 1487, 908] }, // long axis x
    board: { atlas: 'furniture2', rects: [[550, 745, 185, 280], [735, 785, 195, 240]], bounds: [555, 745, 922, 1023] }, // faces +y
    sofa: { atlas: 'furniture3', rects: [[60, 20, 560, 325], [60, 345, 380, 125]], bounds: [76, 35, 601, 469] },  // long axis y, faces +x
    rtable: { atlas: 'furniture3', rects: [[720, 120, 230, 260]], bounds: [728, 136, 941, 365] },
    armchair: { atlas: 'furniture3', rects: [[1060, 50, 380, 360]], bounds: [1073, 63, 1367, 404] },     // faces +y
    lshelf: { atlas: 'furniture3', poly: [[445, 350], [520, 338], [1175, 495], [1178, 700], [1115, 722], [450, 545]], bounds: [448, 340, 1175, 720] }, // long x, books +y
    cabinet: { atlas: 'furniture3', rects: [[65, 500, 300, 460]], bounds: [72, 512, 342, 950] },           // doors +y
    coffee: { atlas: 'furniture3', poly: [[392, 630], [565, 615], [650, 650], [740, 700], [822, 760], [822, 1005], [392, 1005]], bounds: [395, 621, 816, 1000] }, // used from +y
    partition: { atlas: 'furniture3', poly: [[905, 840], [1460, 620], [1536, 620], [1536, 1005], [900, 1005]], bounds: [901, 623, 1508, 1004] }, // long axis y
  },
  rugs: { src: '/api/office/research-lab/assets/rugs', rects: { research: [48, 136, 808, 645], lounge: [855, 152, 1489, 645], entry: [515, 708, 1021, 953] } },
  floor: { src: '/api/office/research-lab/assets/floor', corners: { back: [655, 228], right: [1459, 663], left: [51, 544], front: [853, 1019] },
    clip: [[50, 353], [655, 28], [1462, 503], [1459, 663], [853, 1019], [51, 544]] },
  people: {
    aria: { src: '/api/office/research-lab/assets/aria', mode: 'seated', h: 978, anchor: [650, 790], head: [733, 19] }, // x re-read as the buttock centre after the first render
    luna: { src: '/api/office/research-lab/assets/luna', mode: 'seated', h: 986, anchor: [650, 805], head: [752, 19] },
    noah: { src: '/api/office/research-lab/assets/noah', mode: 'seated', h: 985, anchor: [600, 735], head: [721, 16] },
    leo: { src: '/api/office/research-lab/assets/leo', mode: 'seated', h: 1358, anchor: [580, 1095], head: [496, 113], faces: 'front-left' },
    zoey: { src: '/api/office/research-lab/assets/zoey', mode: 'standing', h: 1442, anchor: [564, 1488], head: [515, 47], tips: [[797, 532], [835, 686]] }, // probe tips read off a 50 px grid (drafts/probe.png)
    max: { src: '/api/office/research-lab/assets/max', mode: 'standing', h: 1416, anchor: [600, 1495], head: [502, 80] },
  },
  idle: { src: '/api/office/research-lab/assets/idle', cw: 1254 / 4, ch: 1254 / 2,
    cells: { front: { col: 0, foot: [156, 603], top: 85 }, back: { col: 1, foot: [478, 602], top: 83 } }, height: 520,
    turn: { front: { col: 0, foot: [[143, 605], [149, 1175]], head: [160.5, 161] }, back: { col: 1, foot: [[494, 604], [493, 1175]], head: [460.5, 461.5] }, left: { col: 2, foot: [[774, 603], [772, 1177]], head: [785.5, 787] }, right: { col: 3, foot: [[1112, 603], [1111, 1177]], head: [1094.5, 1095.5] } } },
  sit2: { src: '/api/office/research-lab/assets/sit2',
    rect: { stand: [0, 0, 512, 535], prep: [512, 0, 512, 535], half: [1024, 0, 512, 535], seat: [0, 535, 512, 489], hands: [512, 535, 512, 489], type: [1024, 535, 512, 489] },
    foot: { stand: [321, 513], prep: [788, 517], half: [1281, 523], seat: [366, 997], hands: [834, 995], type: [1322, 1001] },
    top: { stand: 11, prep: 58, half: 105, seat: 546, hands: 548, type: 553 }, headCx: { stand: 321, prep: 807, half: 1300, seat: 312, hands: 781, type: 1264 },
    bx: { stand: [194, 447], prep: [674, 930], half: [1160, 1426], seat: [185, 447], hands: [649, 937], type: [1139, 1439] },
    headWidth: 252, walkHeadWidth: 216, hipFromFoot: [-122, -84],
    handL: { piece: [[1322, 790], [1335, 784], [1350, 782], [1362, 787], [1369, 797], [1365, 803], [1355, 803], [1352, 810], [1345, 816], [1332, 816], [1324, 810]], pivot: [1322, 803], at: [1345, 800] },
    handR: { piece: [[1375, 817], [1387, 802], [1400, 792], [1412, 789], [1425, 791], [1434, 800], [1436, 817], [1430, 823], [1420, 820], [1410, 827], [1400, 835], [1387, 838], [1380, 835]], pivot: [1378, 826], at: [1410, 812] },
    halfSeg: { pivot: [1270, 425], lean: { rot: -13, dy: 0 },
      upper: [[1024, 0], [1536, 0], [1536, 420], [1300, 420], [1295, 412], [1260, 420], [1230, 423], [1200, 418], [1165, 408], [1140, 400], [1024, 400]],
      lower: [[1024, 385], [1140, 385], [1165, 393], [1200, 403], [1230, 408], [1260, 405], [1295, 397], [1300, 414], [1536, 414], [1536, 535], [1024, 535]] },
    seatSeg: { dy: 34,
      upper: [[0, 535], [512, 535], [512, 870], [420, 870], [360, 876], [300, 888], [260, 892], [220, 882], [180, 870], [0, 870]],
      lower: [[0, 860], [180, 860], [220, 872], [260, 882], [300, 878], [360, 866], [420, 860], [512, 860], [512, 1024], [0, 1024]] } },
  legsFL: { src: '/api/office/research-lab/assets/legsFL', frames: ['F1', 'F2', 'F3', 'F4'],
    rect: { F1: [0, 0, 524, 605], F2: [524, 0, 768, 605], F3: [0, 605, 524, 613], F4: [524, 605, 768, 613] },
    place: { F1: [0.7143, -7, -2], F2: [0.7166, -433.8, -2.4], F3: [0.7166, -12.5, -424.5], F4: [0.7166, -431, -423.8] },
    hem: [[150, 330], [200, 322], [222, 322], [222, 306], [245, 312], [265, 312], [285, 326], [302, 324], [314, 314], [318, 300], [322, 288], [336, 290], [338, 312], [360, 316], [380, 330]],
    rig: { cell: 'F2', hip: [945, 425], knee: [952, 490], ankle: [950, 546], kneeC: [954, 490], kneeR: 34,
      thigh: [[921, 438], [988, 434], [990, 458], [989, 490], [919, 490], [913, 462]], shin: [[919, 490], [990, 490], [990, 541], [903, 541], [912, 515]],
      shoe: [[878, 536], [993, 536], [1000, 560], [1000, 612], [878, 612]], band: [[920, 430], [985, 428], [990, 456], [924, 456]],
      lat: [46, -22], lift: 16, minS: 0.85, maxS: 1.12, tilt: 10, shoeOrder: 4, dip: 12,
      flipLook: 0.8,
      views: { 'front-left': { col: 0, head: 240.5 },
        'front-right': { col: 1, head: 238.5, mirror: 468.5, swap: true, hem: [[126.5, 330], [136.5, 292], [154.5, 292], [162.5, 302], [181.5, 318], [198.5, 322], [206.5, 310], [231.5, 310], [253.5, 306], [256.5, 320], [274.5, 320], [301.5, 318], [326.5, 318], [356.5, 330]] } } } },
  pending: { furnitureB: null },
};
