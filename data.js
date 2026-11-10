/* ============================================================
 * Ring Star — 数据文件（示例数据，可直接替换）
 * ------------------------------------------------------------
 * 说明：
 *  1. 所有「图片」字段（image / cover）留空时，页面会自动生成
 *     「渐变 + 名字首字 + 星座符号」的占位头像，不会出现破图；
 *     之后想用真实照片，把图片 URL 或本地相对路径填进 image 即可。
 *  2. 每个人物/角色必须包含 id、name、image、zodiac、mbti 这几个
 *     字段，它们会被「视图(3D)」和「匹配」共用。
 *  3. 星座必须使用下面 ZODIAC.list 里的标准写法。
 * ============================================================ */

/* ---------- 星座基础信息 ---------- */
window.ZODIAC = {
  list: [
    "白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座",
    "天秤座", "天蝎座", "射手座", "摩羯座", "水瓶座", "双鱼座"
  ],
  symbol: {
    "白羊座": "♈", "金牛座": "♉", "双子座": "♊", "巨蟹座": "♋",
    "狮子座": "♌", "处女座": "♍", "天秤座": "♎", "天蝎座": "♏",
    "射手座": "♐", "摩羯座": "♑", "水瓶座": "♒", "双鱼座": "♓"
  },
  /* 四象 */
  element: {
    "白羊座": "火", "狮子座": "火", "射手座": "火",
    "金牛座": "土", "处女座": "土", "摩羯座": "土",
    "双子座": "风", "天秤座": "风", "水瓶座": "风",
    "巨蟹座": "水", "天蝎座": "水", "双鱼座": "水"
  },
  elementNames: { "火": "火象", "土": "土象", "风": "风象", "水": "水象" },
  elementColor: { "火": "#e8a09a", "土": "#d4b06a", "风": "#8fb8e0", "水": "#82b8c8" },
  elementDesc: {
    "火": "热情、行动力强、直率",
    "土": "稳重、务实、可靠",
    "风": "理性、善沟通、灵活",
    "水": "细腻、感性、共情力强"
  }
};

/* ---------- 全站数据 ---------- */
window.DATA = {
  celebrities: {
    /* 内娱 */
    neiDi: [
      { id: "ny01", name: "王俊凯", image: "images/ny01.jpg", zodiac: "处女座", mbti: "", birthday: "1999.09.21", intro: "TFBOYS队长，歌手演员，北京电影学院毕业，多领域发展", works: "《万里归途》《断·桥》《重生之门》；歌曲《树读》" },
      { id: "ny02", name: "王源", image: "images/ny02.jpg", zodiac: "天蝎座", mbti: "INFP", birthday: "2000.11.08", intro: "TFBOYS成员，原创歌手演员，伯克利音乐学院在读", works: "歌曲《十七》《源》《客厅狂欢》；电影《地久天长》《孤星计划》" },
      { id: "ny03", name: "易烊千玺", image: "images/ny03.jpg", zodiac: "射手座", mbti: "", birthday: "2000.11.28", intro: "TFBOYS成员，演员舞者，中央戏剧学院毕业，奖项认可度高", works: "《少年的你》《送你一朵小红花》《长津湖》《满江红》《小小的我》" },
      { id: "ny04", name: "赵今麦", image: "images/ny04.jpg", zodiac: "天秤座", mbti: "INFP", birthday: "2002.09.29", intro: "童星出身，实力派女演员，中央戏剧学院毕业", works: "《流浪地球》《开端》《少年派》《初恋那件小事》" },
      { id: "ny05", name: "卢昱晓", image: "images/ny05.jpg", zodiac: "天秤座", mbti: "ENFP", birthday: "1999.09.27", intro: "内地女演员，曾留学英国，擅长破碎感古装角色", works: "《云之羽》《时光与他，恰是正好》《小巷人家》《入青云》" }
    ],

    /* 韩娱 */
    hanYu: [
      { id: "hy01", name: "Ruka", alias: "河井瑠花 / BABYMONSTER", image: "images/hy01.jpg", zodiac: "双鱼座", mbti: "ISTJ", birthday: "2002.03.20", intro: "日本成员，主舞、主rap，YG首位日本女练习生之一", works: "《BATTER UP》《CLIK CLAK》《DRIP》" },
      { id: "hy02", name: "Pharita", alias: "帕丽塔 / BABYMONSTER", image: "images/hy02.jpg", zodiac: "处女座", mbti: "INTP", birthday: "2005.08.26", intro: "泰国成员，主唱，音色温柔", works: "《BATTER UP》《Stuck In The Middle》" },
      { id: "hy03", name: "Asa", alias: "榎並杏紗 / BABYMONSTER", image: "images/hy03.jpg", zodiac: "白羊座", mbti: "INFP", birthday: "2006.04.17", intro: "日本成员，主rap，创作能力强", works: "《BATTER UP》《CLIK CLAK》" },
      { id: "hy04", name: "Ahyeon", alias: "郑雅贤 / BABYMONSTER", image: "images/hy04.jpg", zodiac: "白羊座", mbti: "ISTJ", birthday: "2007.04.11", intro: "韩国成员，ACE、主唱、门面，话题度高", works: "《BATTER UP》《SHEESH》" },
      { id: "hy05", name: "Rami", alias: "申夏蓝 / BABYMONSTER", image: "images/hy05.jpg", zodiac: "天秤座", mbti: "INFJ", birthday: "2007.10.17", intro: "韩国成员，实力派主唱，高音稳定", works: "《SHEESH》《DRIP》" },
      { id: "hy06", name: "Rora", alias: "李茶仁 / BABYMONSTER", image: "images/hy06.jpg", zodiac: "狮子座", mbti: "INTP", birthday: "2008.08.14", intro: "韩国成员，领唱、门面，童星出身", works: "《SHEESH》《CLIK CLAK》" },
      { id: "hy07", name: "Chiquita", alias: "BABYMONSTER", image: "images/hy07.jpg", zodiac: "水瓶座", mbti: "ISFP", birthday: "2009.02.17", intro: "泰国忙内，舞担，舞台表现力强", works: "《SHEESH》《DRIP》" },
      { id: "hy08", name: "张圭珍", alias: "Kyujin / 金主训 · NMIXX", image: "images/hy08.jpg", zodiac: "双子座", mbti: "ESFJ", birthday: "2006.05.26", intro: "NMIXX忙内，主舞、rap、vocal，舞台感染力强", works: "《O.O》《DICE》《Love Me Like This》" },
      { id: "hy09", name: "申惟", alias: "SHINYU / TWS", image: "images/hy09.jpg", zodiac: "天蝎座", mbti: "", birthday: "2003.11.07", intro: "PLEDIS男团TWS队长，主唱，气质清冷", works: "《Plot Twist》《If I'm S, Can You Be My N?》" },
      { id: "hy25", name: "英宰", alias: "Youngjae / 崔英宰 · TWS", image: "images/hy25.jpg", zodiac: "双子座", mbti: "", birthday: "2005.05.31", intro: "TWS主唱，嗓音清亮，现场稳定", works: "《Plot Twist》《If I'm S, Can You Be My N?》" },
      { id: "hy26", name: "韩振", alias: "Hanjin / TWS", image: "images/hy26.jpg", zodiac: "摩羯座", mbti: "", birthday: "2006.01.05", intro: "TWS门面、副主唱，组合中国籍成员", works: "《Plot Twist》《If I'm S, Can You Be My N?》" },
      { id: "hy27", name: "志薰", alias: "Jihoon / TWS", image: "images/hy27.jpg", zodiac: "白羊座", mbti: "", birthday: "2006.03.28", intro: "TWS主舞、副rap，舞蹈线条出众", works: "《Plot Twist》《If I'm S, Can You Be My N?》" },
      { id: "hy28", name: "炅潣", alias: "Kyungmin / TWS", image: "images/hy28.jpg", zodiac: "天秤座", mbti: "", birthday: "2007.10.02", intro: "TWS忙内，vocal，少年感强", works: "《Plot Twist》《If I'm S, Can You Be My N?》" },
      { id: "hy10", name: "雪允", alias: "Sullyoon / 薛仑娥 · NMIXX", image: "images/hy10.jpg", zodiac: "水瓶座", mbti: "ISFP", birthday: "2004.01.26", intro: "NMIXX门面、领唱，四代颜值line，擅长外语", works: "《O.O》《DICE》《Love Me Like This》" },
      { id: "hy11", name: "IU", alias: "李知恩", image: "images/hy11.jpg", zodiac: "金牛座", mbti: "INFP", birthday: "1993.05.16", intro: "国民solo歌手+演员，创作型艺人，音源女王", works: "歌曲《好日子》《Celebrity》《LILAC》；剧《德鲁纳酒店》《我的大叔》" },
      { id: "hy12", name: "安宥真", alias: "IVE", image: "images/hy12.jpg", zodiac: "处女座", mbti: "ISTP", birthday: "2003.09.01", intro: "IVE队长，前IZ*ONE成员，舞台稳、综艺感强", works: "《ELEVEN》《LOVE DIVE》《I AM》；IZ*ONE《Violeta》" },
      { id: "hy13", name: "申留真", alias: "ITZY Ryujin", image: "images/hy13.jpg", zodiac: "白羊座", mbti: "INTJ", birthday: "2001.04.17", intro: "ITZY主rap、center，MIXNINE女组第一名，酷感风格", works: "《DALLA DALLA》《WANNABE》《SNEAKERS》" },
      { id: "hy14", name: "柳智敏", alias: "Karina / 刘知珉 · aespa", image: "images/hy14.jpg", zodiac: "白羊座", mbti: "ENFP", birthday: "2000.04.11", intro: "aespa队长、主舞、ACE，GOT the beat成员", works: "《Next Level》《Savage》《Drama》《Spicy》" },
      { id: "hy15", name: "朴敏珠", alias: "Minju / ILLIT", image: "images/hy15.jpg", zodiac: "金牛座", mbti: "ISTP", birthday: "2004.05.11", intro: "ILLIT主唱，R U Next?选秀出道，前YG练习生", works: "《Magnetic》《Lucky Girl Syndrome》" },
      { id: "hy16", name: "车银优", alias: "ASTRO", image: "images/hy16.jpg", zodiac: "白羊座", mbti: "INFJ", birthday: "1997.03.30", intro: "演员、歌手，脸蛋天才，成均馆大学高材生", works: "《我的ID是江南美人》《新入史官丘海昤》《Island》" },
      { id: "hy17", name: "宋江", image: "images/hy17.jpg", zodiac: "金牛座", mbti: "INTP", birthday: "1994.04.23", intro: "演员，Netflix韩剧常客，被称为Netflix之子", works: "《甜蜜家园》《无法抗拒的他》《喜欢的话请响铃》《与恶魔有约》" },
      { id: "hy18", name: "金道勋", alias: "Dohoon / TWS", image: "images/hy18.jpg", zodiac: "水瓶座", mbti: "", birthday: "2005.01.30", intro: "TWS主舞、主唱、center，舞台表现力强", works: "《Plot Twist》《If I'm S, Can You Be My N?》" },
      { id: "hy19", name: "金智媛", image: "images/hy19.jpg", zodiac: "天秤座", mbti: "INFP", birthday: "1992.10.19", intro: "实力派女演员，气质高级", works: "《太阳的后裔》《我的出走日记》《眼泪女王》" },
      { id: "hy20", name: "薛仁雅", image: "images/hy20.jpg", zodiac: "摩羯座", mbti: "", birthday: "1996.01.03", intro: "韩国演员，演技灵动，可盐可甜", works: "《社内相亲》《黑暗荣耀》《绿豆传》" },
      { id: "hy21", name: "高允真", image: "images/hy21.jpg", zodiac: "水瓶座", mbti: "", birthday: "1998.02.07", intro: "模特、演员，韩系清冷淡颜代表", works: "《移动》《死期将至》" },
      { id: "hy22", name: "韩孝周", alias: "韩孝珠", image: "images/hy22.jpg", zodiac: "双鱼座", mbti: "", birthday: "1987.02.22", intro: "实力派影后，电影电视剧双开花", works: "《W-两个世界》《监视者们》《灿烂的遗产》" },
      { id: "hy23", name: "申银秀", image: "images/hy23.jpg", zodiac: "天秤座", mbti: "", birthday: "2002.10.23", intro: "新生代女演员，童星出身", works: "《魔女》《闪亮的西瓜》《我的名字》" },
      { id: "hy24", name: "道枝骏佑", alias: "浪花男子 / 日本", image: "images/hy24.jpg", zodiac: "狮子座", mbti: "", birthday: "2002.07.25", intro: "杰尼斯演员歌手，少年感突出", works: "《成为母亲》《消失的初恋》《金田一少年事件簿》《今夜，即便这份恋情从世界消散》" }
    ],

    /* 泰娱 */
    taiYu: {
      singles: [
        { id: "ty01", name: "Jan Ployshompoo Supasap", alias: "Janhae", image: "images/ty01.jpg", zodiac: "摩羯座", mbti: "", birthday: "1995.01.05", intro: "GMMTV演员、SIZZY队长，国立法政大学PPE专业", works: "《一年生》《爱与背叛》《鱼你相医》《樱桃魔法（泰版）》" },
        { id: "ty02", name: "JingJing Prariyapit Yu", image: "images/ty02.jpg", zodiac: "白羊座", mbti: "", birthday: "1997.04.01", intro: "中泰混血模特演员，泰国超模大赛冠军，2024年加入GMMTV", works: "《App War》《Enemies with Benefits》《Hide & Sis》" }
      ],
      cps: [
        {
          id: "milklove",
          cpName: "MilkLove（奶爱）",
          douyin: "https://www.douyin.com/search/MilkLove",
          members: [
            { id: "ty03", name: "Milk Pansa Vosbein", alias: "奶姐", image: "images/ty03.jpg", zodiac: "狮子座", mbti: "ESFP", birthday: "1996.07.31", intro: "GMMTV演员模特，清迈梅州大学营销专业，YSL品牌大使", works: "《23.5》《两小无猜》《鲸鱼杂货铺》《女生规则》" },
            { id: "ty04", name: "Love Pattranite Limpatiyakorn", alias: "爱妹", image: "images/ty04.jpg", zodiac: "双子座", mbti: "INFJ", birthday: "2000.05.23", intro: "GMMTV演员，诗纳卡宁威洛大学电影与数字媒体，自有彩妆品牌Twenty Wendy", works: "《23.5》《两小无猜》《鲸鱼杂货铺》《家庭学校》" }
          ]
        },
        {
          id: "namtanfilm",
          cpName: "NamtanFilm（糖影）",
          douyin: "https://www.douyin.com/search/NamtanFilm",
          members: [
            { id: "ty05", name: "Namtan Tipnaree Weerawatnodom", alias: "糖糖", image: "images/ty05.jpg", zodiac: "巨蟹座", mbti: "", birthday: "1996.07.01", intro: "GMMTV演员主持人，诗纳卡宁威洛大学表演导演硕士", works: "《冥王星爱恋》《朋友界限》《世界上的另一个我》《不曾遗忘的暮色》" },
            { id: "ty06", name: "Film Rachanun Mahawan", alias: "影妹", image: "images/ty06.jpg", zodiac: "巨蟹座", mbti: "INFP", birthday: "2000.07.14", intro: "GMMTV演员，国王科技大学建筑系，擅长绘画", works: "《冥王星爱恋》《假偶天成》《他不是我》《人生纪念册》" }
          ]
        },
        {
          id: "emibonnie",
          cpName: "EmiBonnie（米邦）",
          douyin: "https://www.douyin.com/search/EmiBonnie",
          members: [
            { id: "ty07", name: "Emi Thasorn Klinnium", image: "images/ty07.jpg", zodiac: "金牛座", mbti: "", birthday: "1998.04.25", intro: "中泰混血演员、选美冠军，艺术大学信息通讯专业", works: "《Us（我们的爱情）》《禁忌女孩S2》《Wandee Goodday》" },
            { id: "ty08", name: "Bonnie Pattraphus Borattasuwan", image: "images/ty08.jpg", zodiac: "水瓶座", mbti: "", birthday: "2004.01.27", intro: "新生代演员，诗纳卡宁威洛大学，自有服装品牌VURV.BKK", works: "《Us（我们的爱情）》《High School Frenemy》《女生规则》" }
          ]
        },
        {
          id: "lenamiu",
          cpName: "LenaMiu",
          douyin: "https://www.douyin.com/search/LenaMiu",
          members: [
            { id: "ty09", name: "Lena Lorena Schuett", image: "images/ty09.jpg", zodiac: "射手座", mbti: "INFJ", birthday: "1999.11.25", intro: "泰加混血，泰国3台艺人，朱拉隆功大学传播艺术系", works: "《My Safe Zone》《辛德瑞拉的诡计》《伪烛之焰》《Pls Love》" },
            { id: "ty10", name: "Miu Natsha Taechamongkalapiwat", image: "images/ty10.jpg", zodiac: "射手座", mbti: "ESFJ", birthday: "2001.11.25", intro: "泰国3台演员博主，伦敦时尚学院，软萌爱笑", works: "《My Safe Zone》《Love Lesson 010》《Pls Love》" }
          ]
        }
      ]
    }
  },

  novels: {
    /* 言情 */
    yanQing: [
      {
        id: "he-yi-sheng-xiao-mo",
        title: "何以笙箫默",
        author: "顾漫",
        cover: "",
        protagonists: ["何以琛", "赵默笙"],
        synopsis: "大学时代的何以琛与赵默笙因误会分离，七年后赵默笙回国，两人在重逢中一步步解开误会、破镜重圆。何以琛那句『如果世界上曾经有那个人出现过，其他人都会变成将就，而我不愿意将就』，成为无数读者心中的经典。",
        characters: [
          {
            id: "he-yichen",
            name: "何以琛",
            image: "",
            zodiac: "天蝎座",
            mbti: "INTJ",
            personality: "冷静理性、专一深情，外冷内热，认定的事绝不回头。"
          },
          {
            id: "zhao-mosheng",
            name: "赵默笙",
            image: "",
            zodiac: "狮子座",
            mbti: "ENFP",
            personality: "阳光善良、坚韧执着，外表柔弱，内心却比谁都强大。"
          }
        ]
      },
      {
        id: "wei-wei-yi-xiao",
        title: "微微一笑很倾城",
        author: "顾漫",
        cover: "",
        protagonists: ["肖奈", "贝微微"],
        synopsis: "游戏里的大神『一笑奈何』与红衣女侠『芦苇微微』结成侠侣，现实中两人竟是同校的计算机系校草肖奈与系花贝微微。从游戏走到现实，一段高甜又势均力敌的恋爱就此展开。",
        characters: [
          {
            id: "xiao-nai",
            name: "肖奈",
            image: "",
            zodiac: "摩羯座",
            mbti: "INTJ",
            personality: "高冷腹黑、天赋卓绝的计算机系大神，宠妻护短，行动永远比情话多。"
          },
          {
            id: "bei-weiwei",
            name: "贝微微",
            image: "",
            zodiac: "天秤座",
            mbti: "ENTP",
            personality: "聪明独立、直爽大方，游戏高手兼系花，敢爱敢恨。"
          }
        ]
      }
    ],

    /* 百合（真实名单，共 34 本；星座/MBTI 由文件末尾的脚本按名字哈希自动分配） */
    baiHe: [
      {
        id: "bh01",
        title: "招惹疯批美人的下场",
        author: "",
        cover: "",
        protagonists: ["古思钰", "霍君娴"],
        synopsis: "一场蓄意的接近，让温和的古思钰闯进疯批美人霍君娴的世界，从此被死死缠住。",
        characters: [
          { id: "bh01a", name: "古思钰", image: "", personality: "温和克制、步步退让，却在不知不觉中被对方拿捏。" },
          { id: "bh01b", name: "霍君娴", image: "", personality: "偏执疯批、占有欲极强，认准的人绝不放手。" }
        ]
      },
      {
        id: "bh02",
        title: "慢热",
        author: "",
        cover: "https://resourcecp-cdn.gongzicp.com/uploads/20220424/0c63f2beccc85824b5ab3f5fca19d6f9c9.jpg?x-oss-process=style/original",
        protagonists: ["叶迎溪", "姜慢"],
        synopsis: "一个慢热的人遇见另一个更慢热的人，感情在细水长流里慢慢升温。",
        characters: [
          { id: "bh02a", name: "叶迎溪", image: "", personality: "慢热内敛，习惯把喜欢藏进细节里。" },
          { id: "bh02b", name: "姜慢", image: "", personality: "迟钝又温柔，后知后觉才发现早已心动。" }
        ]
      },
      {
        id: "bh03",
        title: "停年",
        author: "",
        cover: "",
        protagonists: ["莫惊年", "黎此"],
        synopsis: "时光停在某一年，多年后重逢的两人重新拾起未竟的感情。",
        characters: [
          { id: "bh03a", name: "莫惊年", image: "", personality: "沉稳克制，把心事都压在心底。" },
          { id: "bh03b", name: "黎此", image: "", personality: "倔强敏感，用冷淡掩饰真心。" }
        ]
      },
      {
        id: "bh04",
        title: "灯灯灯灯",
        author: "",
        cover: "",
        protagonists: ["贺稔", "程尽灯"],
        synopsis: "一盏灯下，两个原本没有交集的人被命运一点点牵到一起。",
        characters: [
          { id: "bh04a", name: "贺稔", image: "", personality: "温柔坚定，像深夜里的光。" },
          { id: "bh04b", name: "程尽灯", image: "", personality: "独立坚强，习惯独自扛下一切。" }
        ]
      },
      {
        id: "bh05",
        title: "冬日花火",
        author: "",
        cover: "",
        protagonists: ["沈楝", "郑汀雨"],
        synopsis: "冬天里的一场花火，照亮了两个女孩之间隐秘而炽热的心事。",
        characters: [
          { id: "bh05a", name: "沈楝", image: "", personality: "清冷安静，内心却藏着滚烫的温柔。" },
          { id: "bh05b", name: "郑汀雨", image: "", personality: "热烈直率，喜欢就大胆靠近。" }
        ]
      },
      {
        id: "bh06",
        title: "旧雪难融",
        author: "",
        cover: "https://i1-static.jjwxc.net/tmp/backend/authorspace/s1/43/42390/4238903/20241014200034_300_420.jpeg",
        protagonists: ["邱一燃", "黎春风"],
        synopsis: "旧年的雪迟迟不化，多年后重逢，她们终于把当年的误会说开。",
        characters: [
          { id: "bh06a", name: "邱一燃", image: "", personality: "执拗深情，嘴上说放下心里却没放下。" },
          { id: "bh06b", name: "黎春风", image: "", personality: "温和包容，是冬天过后吹来的暖风。" }
        ]
      },
      {
        id: "bh07",
        title: "宝石商人和钻石小姐",
        author: "",
        cover: "",
        protagonists: ["闻谨言", "陆乔薇"],
        synopsis: "精明的宝石商人与骄矜的钻石小姐，在一场交易里动了真心。",
        characters: [
          { id: "bh07a", name: "闻谨言", image: "", personality: "精明冷静、步步为营，唯独对她狠不下心。" },
          { id: "bh07b", name: "陆乔薇", image: "", personality: "骄矜骄傲，被偏爱后开始学着低头。" }
        ]
      },
      {
        id: "bh08",
        title: "太阳心下",
        author: "",
        cover: "",
        protagonists: ["郭台", "杨下"],
        synopsis: "她像太阳一样耀眼，而她甘愿做被照亮的影子，直到太阳主动靠近。",
        characters: [
          { id: "bh08a", name: "郭台", image: "", personality: "阳光耀眼、众星捧月，眼里却只有她。" },
          { id: "bh08b", name: "杨下", image: "", personality: "安静低调，习惯仰望，后来才敢伸手。" }
        ]
      },
      {
        id: "bh09",
        title: "放肆",
        author: "",
        cover: "https://s0-static.jjwxc.net/tmp/guanli/frontcover/004/032/4032130.jpg",
        protagonists: ["秦意浓", "唐若遥"],
        synopsis: "一场放肆的接近，让原本克制克制的两人越了界。",
        characters: [
          { id: "bh09a", name: "秦意浓", image: "", personality: "强势霸道，想要的就一定要得到。" },
          { id: "bh09b", name: "唐若遥", image: "", personality: "清醒自律，却一次次为她破例。" }
        ]
      },
      {
        id: "bh10",
        title: "暗瘾",
        author: "",
        cover: "https://img10.360buyimg.com/imgzone/jfs/t1/35853/6/22917/1856382/66c497c9F89bedec5/0f86a9688ef574e2.png",
        protagonists: ["南潇雪", "安常"],
        synopsis: "有些喜欢像戒不掉的瘾，明知道危险却还是沉沦。",
        characters: [
          { id: "bh10a", name: "南潇雪", image: "", personality: "神秘危险，像让人上瘾的毒。" },
          { id: "bh10b", name: "安常", image: "", personality: "平静克制，却被她打破了所有底线。" }
        ]
      },
      {
        id: "bh11",
        title: "沉溺",
        author: "",
        cover: "",
        protagonists: ["姜念", "姚染"],
        synopsis: "一场沉溺，让两个人都无法自拔。",
        characters: [
          { id: "bh11a", name: "姜念", image: "", personality: "温柔又危险，用深情把人困住。" },
          { id: "bh11b", name: "姚染", image: "", personality: "倔强嘴硬，嘴上拒绝心里却早已沦陷。" }
        ]
      },
      {
        id: "bh12",
        title: "飘飘",
        author: "",
        cover: "https://resourcecp-cdn.gongzicp.com/uploads/20240908/0cb562995c53b7293b854de63c6917c083.jpg?x-oss-process=style/original",
        protagonists: ["陶浸", "陈飘飘"],
        synopsis: "看似飘忽不定的她，其实一直在等一个人停下来。",
        characters: [
          { id: "bh12a", name: "陶浸", image: "", personality: "沉稳踏实，愿意做她停靠的岸。" },
          { id: "bh12b", name: "陈飘飘", image: "", personality: "自由散漫，漂泊久了也想要一个家。" }
        ]
      },
      {
        id: "bh13",
        title: "晚潮",
        author: "",
        cover: "https://resourcecp-cdn.gongzicp.com/uploads/20220815/0c6ed5f95eacf7fa5d1b787716e6cfea78.jpeg?x-oss-process=style/original",
        protagonists: ["向挽", "晁新"],
        synopsis: "傍晚的潮水涌来，把两个人心底的话都带了出来。",
        characters: [
          { id: "bh13a", name: "向挽", image: "", personality: "温柔隐忍，把爱意藏进晚风里。" },
          { id: "bh13b", name: "晁新", image: "", personality: "热烈坦诚，不肯让喜欢留到明天。" }
        ]
      },
      {
        id: "bh14",
        title: "神龛",
        author: "",
        cover: "",
        protagonists: ["施然", "阮阮"],
        synopsis: "她把她当神一样供奉，却发现神也动了凡心。",
        characters: [
          { id: "bh14a", name: "施然", image: "", personality: "虔诚克制，爱得小心翼翼。" },
          { id: "bh14b", name: "阮阮", image: "", personality: "清冷疏离，却唯独对她心软。" }
        ]
      },
      {
        id: "bh15",
        title: "玉中遇",
        author: "",
        cover: "",
        protagonists: ["楚玊", "唐玦"],
        synopsis: "一块玉、一场相遇，两个名字都带玉的人从此有了牵绊。",
        characters: [
          { id: "bh15a", name: "楚玊", image: "", personality: "温润如玉，外柔内刚。" },
          { id: "bh15b", name: "唐玦", image: "", personality: "锋芒内敛，认定的事绝不回头。" }
        ]
      },
      {
        id: "bh16",
        title: "帮我拍拍",
        author: "",
        cover: "",
        protagonists: ["苏唱", "于舟"],
        synopsis: "一句「帮我拍拍」，让她成了她生活里最依赖的人。",
        characters: [
          { id: "bh16a", name: "苏唱", image: "", personality: "温柔贴心，总是默默照顾对方。" },
          { id: "bh16b", name: "于舟", image: "", personality: "依赖又傲娇，离不开却不肯承认。" }
        ]
      },
      {
        id: "bh17",
        title: "随时待命",
        author: "",
        cover: "",
        protagonists: ["林也", "唐非晚"],
        synopsis: "她说随时待命，于是真的随叫随到，成了她最安心的存在。",
        characters: [
          { id: "bh17a", name: "林也", image: "", personality: "忠诚可靠，永远是她的退路。" },
          { id: "bh17b", name: "唐非晚", image: "", personality: "独立要强，却学会了依赖一个人。" }
        ]
      },
      {
        id: "bh18",
        title: "影后成双",
        author: "",
        cover: "https://s3-static.jjwxc.net/tmp/guanli/frontcover/002/993/2993773.jpg",
        protagonists: ["陆饮冰", "夏以桐"],
        synopsis: "高冷影后与她的助理，台前幕后，一段双向奔赴的感情。",
        characters: [
          { id: "bh18a", name: "陆饮冰", image: "", personality: "高冷影后，外冷内热，只对她展露柔软。" },
          { id: "bh18b", name: "夏以桐", image: "", personality: "温柔细腻，用陪伴一点点走进她心里。" }
        ]
      },
      {
        id: "bh19",
        title: "桃李不言",
        author: "",
        cover: "https://i4-static.jjwxc.net/tmp/backend/authorspace/s1/18/17663/1766218/20200528092439_300_420.jpg",
        protagonists: ["言蹊", "安之"],
        synopsis: "桃李不言，下自成蹊；有些感情不必说出口，早已心照不宣。",
        characters: [
          { id: "bh19a", name: "言蹊", image: "", personality: "温柔坚定，用行动代替言语。" },
          { id: "bh19b", name: "安之", image: "", personality: "安静通透，懂得她所有沉默。" }
        ]
      },
      {
        id: "bh20",
        title: "细雨琢石",
        author: "",
        cover: "",
        protagonists: ["舒望", "唐逸枫"],
        synopsis: "细雨能琢石，长久的陪伴终于叩开了她的心门。",
        characters: [
          { id: "bh20a", name: "舒望", image: "", personality: "细腻耐心，相信时间能证明一切。" },
          { id: "bh20b", name: "唐逸枫", image: "", personality: "冷漠疏离，被一点点暖化。" }
        ]
      },
      {
        id: "bh21",
        title: "余生为期",
        author: "",
        cover: "https://i5-static.jjwxc.net/authorimagespace.php?path=NDIzMzk5&imageName=20250812152202.JPG",
        protagonists: ["萧宛青", "林羡"],
        synopsis: "以余生为期，许下相伴一生的约定。",
        characters: [
          { id: "bh21a", name: "萧宛青", image: "", personality: "稳重深情，愿意用一辈子去守。" },
          { id: "bh21b", name: "林羡", image: "", personality: "率真热烈，认定的人就绝不撒手。" }
        ]
      },
      {
        id: "bh22",
        title: "临时暧昧",
        author: "",
        cover: "",
        protagonists: ["谢安青", "陈礼"],
        synopsis: "说好只是临时暧昧，却在相处中动了真心。",
        characters: [
          { id: "bh22a", name: "谢安青", image: "", personality: "理性克制，想守住界限却先越了界。" },
          { id: "bh22b", name: "陈礼", image: "", personality: "游刃有余，直到发现这次不想放手。" }
        ]
      },
      {
        id: "bh23",
        title: "她属于我",
        author: "",
        cover: "https://i8-static.jjwxc.net/tmp/backend/authorspace/s1/3/2496/249557/20260730093138_300_420.jpg",
        protagonists: ["姜瓷", "鹿行雪"],
        synopsis: "强烈的占有欲背后，是藏不住的爱。",
        characters: [
          { id: "bh23a", name: "姜瓷", image: "", personality: "占有欲强，爱得热烈而偏执。" },
          { id: "bh23b", name: "鹿行雪", image: "", personality: "清冷倔强，甘愿被她圈进怀里。" }
        ]
      },
      {
        id: "bh24",
        title: "月光照不到",
        author: "",
        cover: "",
        protagonists: ["林韵声", "陈谨悦"],
        synopsis: "有些角落月光照不到，却有一个人愿意为她点灯。",
        characters: [
          { id: "bh24a", name: "林韵声", image: "", personality: "温柔坚定，做她黑暗里的光。" },
          { id: "bh24b", name: "陈谨悦", image: "", personality: "内敛脆弱，慢慢学着被爱。" }
        ]
      },
      {
        id: "bh25",
        title: "蓄谋冰山教授",
        author: "",
        cover: "",
        protagonists: ["舒絮", "乔弄溪"],
        synopsis: "一场蓄谋已久的靠近，只为融化这座冰山。",
        characters: [
          { id: "bh25a", name: "舒絮", image: "", personality: "蓄谋已久，步步为营只为靠近她。" },
          { id: "bh25b", name: "乔弄溪", image: "", personality: "冷若冰霜，终究被她的执着融化。" }
        ]
      },
      {
        id: "bh26",
        title: "和豪门大小姐分手后",
        author: "",
        cover: "",
        protagonists: ["谈云舒", "方逾"],
        synopsis: "分手后各自成长，再重逢时才发现谁都放不下谁。",
        characters: [
          { id: "bh26a", name: "谈云舒", image: "", personality: "独立清醒，分手后拼命证明自己。" },
          { id: "bh26b", name: "方逾", image: "", personality: "骄矜隐忍，回头时才肯承认爱。" }
        ]
      },
      {
        id: "bh27",
        title: "和心机坏女人分手后",
        author: "",
        cover: "https://i1-static.jjwxc.net/tmp/backend/authorspace/s1/21/20834/2083392/20251229110656_300_420.jpeg",
        protagonists: ["怀幸", "楚晚棠"],
        synopsis: "和心机坏女人分手后，才发现自己早已离不开她。",
        characters: [
          { id: "bh27a", name: "怀幸", image: "", personality: "心软嘴硬，嘴上说恨心里却放不下。" },
          { id: "bh27b", name: "楚晚棠", image: "", personality: "心机深沉，坏得让人又爱又恨。" }
        ]
      },
      {
        id: "bh28",
        title: "总有老师要请家长",
        author: "",
        cover: "https://i7-static.jjwxc.net/tmp/backend/authorspace/s1/17/16838/1683768/20250922165007_300_420.jpeg",
        protagonists: ["祁言", "陆知乔"],
        synopsis: "总有老师要请家长，两个「家长」却在一次次见面里走到了一起。",
        characters: [
          { id: "bh28a", name: "祁言", image: "", personality: "温柔负责，认真对待每一个孩子。" },
          { id: "bh28b", name: "陆知乔", image: "", personality: "干练强势，唯独对她温柔。" }
        ]
      },
      {
        id: "bh29",
        title: "少女情怀总是诗",
        author: "",
        cover: "",
        protagonists: ["白沫澄", "池清"],
        synopsis: "少女的心事像诗，写满了不敢说出口的喜欢。",
        characters: [
          { id: "bh29a", name: "白沫澄", image: "", personality: "青涩勇敢，把喜欢写成诗。" },
          { id: "bh29b", name: "池清", image: "", personality: "温柔内敛，读懂了她的每一句。" }
        ]
      },
      {
        id: "bh30",
        title: "都什么年代了啊",
        author: "",
        cover: "",
        protagonists: ["纪鸣橙", "彭姁之"],
        synopsis: "都什么年代了，喜欢一个人就该大声说出来。",
        characters: [
          { id: "bh30a", name: "纪鸣橙", image: "", personality: "大胆直率，从不掩饰心意。" },
          { id: "bh30b", name: "彭姁之", image: "", personality: "别扭害羞，被直球打得措手不及。" }
        ]
      },
      {
        id: "bh31",
        title: "全世界都在等你心动",
        author: "",
        cover: "https://i9-static.jjwxc.net/novelimage.php?novelid=4273357&coverid=71&ver=6cdbbc901d72d54b14c83cf0da10edcd",
        protagonists: ["顾清河", "言臻"],
        synopsis: "全世界都在等她心动，而她等的自始至终只有一个人。",
        characters: [
          { id: "bh31a", name: "顾清河", image: "", personality: "深情执着，愿意一直等下去。" },
          { id: "bh31b", name: "言臻", image: "", personality: "迟钝慢热，心动来得后知后觉。" }
        ]
      },
      {
        id: "bh32",
        title: "冰山教授她追悔莫及",
        author: "",
        cover: "",
        protagonists: ["童浅", "姜梵音"],
        synopsis: "高高在上的冰山教授，失去后才追悔莫及。",
        characters: [
          { id: "bh32a", name: "童浅", image: "", personality: "冷傲自负，失去后才懂得珍惜。" },
          { id: "bh32b", name: "姜梵音", image: "", personality: "温柔坚定，转身后不再回头。" }
        ]
      },
      {
        id: "bh33",
        title: "今日离港",
        author: "",
        cover: "https://i3-static.jjwxc.net/tmp/backend/authorspace/s1/27/26492/2649138/20250813184422_300_420.jpeg",
        protagonists: ["陆诗邈", "薛桐"],
        synopsis: "离港的那天，她们终于把没说出口的话说尽。",
        characters: [
          { id: "bh33a", name: "陆诗邈", image: "", personality: "克制隐忍，把不舍都咽下。" },
          { id: "bh33b", name: "薛桐", image: "", personality: "勇敢直白，不肯让遗憾重演。" }
        ]
      },
      {
        id: "bh34",
        title: "卧底后被港城大小姐缠上了",
        author: "",
        cover: "https://i3-static.jjwxc.net/authorimagespace.php?path=MzgzNDQ4Ng==&imageName=20260801082100.jpg",
        protagonists: ["沈雾", "裴薄研"],
        synopsis: "卧底任务结束后，她却被港城大小姐缠上了。",
        characters: [
          { id: "bh34a", name: "沈雾", image: "", personality: "冷静专业，却拿她的纠缠没办法。" },
          { id: "bh34b", name: "裴薄研", image: "", personality: "骄纵任性，认准了就要追到手。" }
        ]
      }
    ]
  }
};

/* ---------- JanJingJing：由「泰娱 · 单人」里的 Jan 与 JingJing 组成 ----------
 * 复用同一份成员对象，避免重复维护；人物注册表会按 id 去重。 */
(function () {
  var tai = DATA.celebrities.taiYu;
  var jan = tai.singles.find(function (x) { return x.id === "ty01"; });
  var jing = tai.singles.find(function (x) { return x.id === "ty02"; });
  if (jan && jing) {
    tai.cps.push({
      id: "janjingjing",
      cpName: "JanJingJing",
      douyin: "https://www.douyin.com/search/JanJingJing",
      members: [jan, jing]
    });
  }
})();

/* ---------- 泰娱：把每对 CP 的成员拆到「单人」列表 ----------
 * 复用 CP 里的成员对象，按 id 去重，避免重复维护。 */
(function () {
  var tai = DATA.celebrities.taiYu;
  var seen = {};
  tai.singles.forEach(function (m) { seen[m.id] = true; });
  tai.cps.forEach(function (cp) {
    cp.members.forEach(function (m) {
      if (!seen[m.id]) {
        tai.singles.push(m);
        seen[m.id] = true;
      }
    });
  });
})();

/* ============================================================
 * 百合角色：星座 / MBTI 自动分配（趣味设定）
 * 原著未提供这些信息，这里按角色名哈希确定性分配，
 * 保证四象（火/土/风/水）大致均衡，便于「视图」聚类。
 * 想自定义某个角色：直接给它补 zodiac / mbti 字段即可
 * （本脚本只填充缺失项，不会覆盖已有值）。
 * ============================================================ */
(function () {
  var mbtiList = [
    "INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP",
    "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"
  ];
  function hash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }
  DATA.novels.baiHe.forEach(function (n) {
    n.characters.forEach(function (ch) {
      if (!ch.zodiac) ch.zodiac = ZODIAC.list[hash(ch.name) % 12];
      if (!ch.mbti) ch.mbti = mbtiList[hash("mbti:" + ch.name) % 16];
    });
  });
})();

/* ============================================================
 * 抖音搜索链接（按人物 id 对应，详情页会显示「去抖音看看」按钮）
 * 想改某个人的链接：直接改这里；想加小说角色的，也按 id 加即可。
 * ============================================================ */
window.DOUYIN = {
  /* 韩娱 */
  hy01: "https://www.douyin.com/search/Ruka%E6%B2%B3%E4%BA%95%E7%91%A0%E8%8A%B1",
  hy02: "https://www.douyin.com/search/Pharita%E5%B8%95%E4%B8%BD%E5%A1%94",
  hy03: "https://www.douyin.com/search/Asa%E6%A6%8E%E4%B8%A6%E6%9D%8F%E7%B47",
  hy04: "https://www.douyin.com/search/Ahyeon%E9%83%91%E9%9B%85%E8%B4%A4",
  hy05: "https://www.douyin.com/search/Rami%E7%94%B3%E5%A4%8F%E8%93%9D",
  hy06: "https://www.douyin.com/search/Rora%E6%9D%8E%E8%8C%B6%E4%BB%81",
  hy07: "https://www.douyin.com/search/Chiquita%20BABYMONSTER",
  hy08: "https://www.douyin.com/search/%E5%BC%A0%E5%9C%AD%E7%8F%8D%20Kyujin%20NMIXX",
  hy09: "https://www.douyin.com/search/%E7%94%B3%E6%83%9F%20SHINYU%20TWS",
  hy25: "https://www.douyin.com/search/Youngjae%20TWS%20%E8%8B%B1%E5%AE%B0",
  hy26: "https://www.douyin.com/search/Hanjin%20TWS%20%E9%9F%A9%E6%8C%AF",
  hy27: "https://www.douyin.com/search/Jihoon%20TWS%20%E5%BF%97%E8%96%BE",
  hy28: "https://www.douyin.com/search/Kyungmin%20TWS%20%E7%81%85%E6%BD%A3",
  hy10: "https://www.douyin.com/search/%E9%9B%AA%E5%85%81%20Sullyoon",
  hy11: "https://www.douyin.com/search/IU%E6%9D%8E%E7%9F%A5%E6%81%A9",
  hy12: "https://www.douyin.com/search/%E5%AE%89%E5%AE%A5%E7%9C%9F%20IVE",
  hy13: "https://www.douyin.com/search/%E7%94%B3%E7%95%99%E7%9C%9F%20ITZY",
  hy14: "https://www.douyin.com/search/%E6%9F%B3%E6%99%BA%E6%95%8F%20Karina%20aespa",
  hy15: "https://www.douyin.com/search/%E6%9C%B4%E6%95%8F%E7%8F%A0%20Minju%20ILLIT",
  hy16: "https://www.douyin.com/search/%E8%BD%A6%E9%93%B6%E4%BC%98",
  hy17: "https://www.douyin.com/search/%E5%AE%8B%E6%B1%9F%20%E6%BC%94%E5%91%98",
  hy18: "https://www.douyin.com/search/%E9%87%91%E9%81%93%E5%8B%8B%20DOHOON%20TWS",
  hy19: "https://www.douyin.com/search/%E9%87%91%E6%99%BA%E5%AA%9B",
  hy20: "https://www.douyin.com/search/%E8%96%9B%E4%BB%81%E9%9B%85",
  hy21: "https://www.douyin.com/search/%E9%AB%98%E5%85%81%E7%9C%9F",
  hy22: "https://www.douyin.com/search/%E9%9F%A9%E5%AD%9D%E5%91%A8",
  hy23: "https://www.douyin.com/search/%E7%94%B3%E9%93%B6%E7%A7%80",
  hy24: "https://www.douyin.com/search/%E9%81%93%E6%9E%9D%E9%AA%8F%E4%BD%91",
  /* 内娱 */
  ny01: "https://www.douyin.com/search/%E7%8E%8B%E4%BF%8A%E5%87%AF",
  ny02: "https://www.douyin.com/search/%E7%8E%8B%E6%BA%90",
  ny03: "https://www.douyin.com/search/%E6%98%93%E7%83%98%E5%8D%83%E7%8E%BA",
  ny04: "https://www.douyin.com/search/%E8%B5%B5%E4%BB%8A%E9%BA%A6",
  ny05: "https://www.douyin.com/search/%E5%8D%A2%E6%98%B1%E6%99%93",
  /* 泰娱 */
  ty01: "https://www.douyin.com/search/Jan",
  ty02: "https://www.douyin.com/search/JingJing",
  ty03: "https://www.douyin.com/search/Milk",
  ty04: "https://www.douyin.com/search/Love",
  ty05: "https://www.douyin.com/search/Namtan",
  ty06: "https://www.douyin.com/search/Film",
  ty07: "https://www.douyin.com/search/Emi",
  ty08: "https://www.douyin.com/search/Bonnie",
  ty09: "https://www.douyin.com/search/Lena",
  ty10: "https://www.douyin.com/search/Miu"
};
