import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Container, Modal, Button, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import {
  RiArrowLeftLine,
  RiDiceLine,
  RiFileCopyLine,
  RiCheckLine,
  RiDoubleQuotesL,
  RiSparklingLine,
  RiAddLine,
  RiEdit2Line,
  RiDeleteBinLine
} from 'react-icons/ri';
import useAuthStore from '../store/useAuthStore';
import { jokeApi } from '../api/jokeApi';
import { EMOJI_LIST, getEmojiByIdx } from '../utils/emojiList';
import './Joke.css';

// 카테고리 정의
const CATEGORIES = [
  { id: 'all', label: '전체 🎲' },
  { id: 'wtf', label: '어이없음 & 뇌절 🤯' },
  { id: 'real', label: '매장 & 불판 실화 🥩' },
  { id: 'alba', label: '알바 눈물썰 😭' },
  { id: 'nonsense', label: '킹받는 넌센스 🤣' },
  { id: 'escape', label: '퇴근 & 마감 잔혹사 🍺' }
];

// 진짜 웃기고 어이없는 노란돼지 꿀잼 기본 시드 농담 리스트
const funnyJokes = [
  // --- [1] 어이없음 & 뇌절 (wtf) ---
  {
    category: 'wtf',
    badge: '🤯 뇌정지',
    badgeType: 'badge-wtf',
    name: '2층 불판 석탑 사건',
    message: '손님이 "불판 좀 갈아주세요" 하셔서 긴장한 신입 알바생이 새 불판을 기존 불판 위에 2층 석탑처럼 정갈하게 올려두고 유유히 퇴장했습니다. 손님이 경건하게 박수침.'
  },
  {
    category: 'wtf',
    badge: '💬 말귀오해',
    badgeType: 'badge-wtf',
    name: '불 좀 빼주세요 대참사',
    message: '손님이 "불 좀 빼주세요"라고 하셨는데 "물 좀 채워주세요"로 잘못 듣고 활활 타오르는 숯불 한가운데에 냉수를 콸콸 들이부었습니다. 순간 매장에 백두산 천지 화산 폭발급 수증기가 터졌습니다.'
  },
  {
    category: 'wtf',
    badge: '🤖 AI뇌절',
    badgeType: 'badge-wtf',
    name: 'AI 삼겹살 감별기',
    message: 'ChatGPT한테 "삼겹살 다 익었는지 봐줘" 하고 불판 사진 보냈더니 "이 이미지는 폭력적이거나 위험한 콘텐츠일 수 있습니다" 라며 분석을 거부당함. 얼마나 태운 거야?'
  },
  {
    category: 'wtf',
    badge: '💀 주방괴담',
    badgeType: 'badge-wtf',
    name: '사라진 40번 테이블',
    message: '포스기에 분명 "40번 테이블 된장찌개 추가" 떠서 뚝배기 들고 뛰어갔는데 매장엔 38번 테이블까지만 있습니다. 나폴리탄 괴담 실시간 체험.'
  },
  {
    category: 'wtf',
    badge: '🤯 뇌정지',
    badgeType: 'badge-wtf',
    name: '환풍구 가발 실종사건',
    message: '테이블 닥트 환풍기 흡입력을 최대로 틀어놨더니 손님 가발이 후루룩 빨려 들어갈 뻔한 사건. 알바생이 온몸을 던져 공중에서 낚아채고 팁 5만원 받았습니다.'
  },
  {
    category: 'wtf',
    badge: '💬 말귀오해',
    badgeType: 'badge-wtf',
    name: '민증 까보세요',
    message: '손님이 너무 성숙해 보이셔서 "민증 한번만 보여주시겠어요?" 했더니 손님이 갑자기 테이블 밑으로 슬라이딩해서 출입문으로 도망쳤습니다. 도대체 몇 살이셨던 건가요?'
  },
  {
    category: 'wtf',
    badge: '🤯 뇌정지',
    badgeType: 'badge-wtf',
    name: '10명 단체 더치페이',
    message: '대학생 단체 손님 10명이 카운터로 몰려와서 "각각 10분의 1씩 결제해주세요"라며 카드를 부채처럼 촥 펼치셨습니다. 포스기 영수증 10미터 연속 출력의 기적.'
  },
  {
    category: 'wtf',
    badge: '💀 주방괴담',
    badgeType: 'badge-wtf',
    name: '덜 차가운 얼음물',
    message: '얼음물 달라고 하셔서 정성껏 얼음 동동 띄워 드렸더니 손님이 "얼음이 너무 차가워서 이가 시린데 덜 차가운 얼음은 없어요?"라고 진지하게 물어보셨습니다. 끓여드릴까요...?'
  },
  {
    category: 'wtf',
    badge: '🤯 뇌정지',
    badgeType: 'badge-wtf',
    name: '호출벨 격투게임 콤보',
    message: '호출벨이 딩동- 딩동- 50번 연속 울려서 번개처럼 뛰어갔더니, 만 4세 꼬마 손님이 벨을 오락실 철권 버튼처럼 연타하며 부모님 몰래 콤보 연습을 하고 계셨습니다.'
  },
  {
    category: 'wtf',
    badge: '💬 말귀오해',
    badgeType: 'badge-wtf',
    name: '불판 들고 도주',
    message: '손님이 "불 좀 빼주세요" 하셨는데 정신이 나가서 뜨거운 불판을 통째로 집게로 낚아채 주방으로 전력 질주했습니다. 손님이 불판 도둑인 줄 알고 쫓아오심.'
  },

  // --- [2] 매장 & 불판 실화 (real) ---
  {
    category: 'real',
    badge: '🚨 실화냐',
    badgeType: 'badge-real',
    name: '소주 1병 추가의 비극',
    message: '금요일 피크타임에 손님이 "여기 참이슬 하나요!" 외쳤는데 너무 정신없어서 주머니에 있던 에어팟 프로 케이스를 뚜껑 딱 따서 소주잔에 꽂아줄 뻔했습니다.'
  },
  {
    category: 'real',
    badge: '🥩 불판대참사',
    badgeType: 'badge-chaos',
    name: '고기 뒤집는 타이밍의 비밀',
    message: '손님이 "알바생님, 고기 언제 뒤집어요?" 물어보길래 "돼지가 하늘을 세 번 쳐다볼 때 뒤집으시면 됩니다"라고 헛소리했는데 손님이 진지하게 끄덕거리며 5분째 고기만 뚫어지게 응시하고 계심. 죄송합니다...'
  },
  {
    category: 'real',
    badge: '🚨 실화냐',
    badgeType: 'badge-real',
    name: '단골 손님의 마약(?) 가루',
    message: '단골 손님이 주머니에서 비밀 가루를 몰래 꺼내 고기에 솔솔 뿌리시길래 마약인 줄 알고 신고할 뻔했는데... 집에서 챙겨오신 맛소금이었습니다. 형님 노란돼지 고기는 원래 맛있어요...'
  },
  {
    category: 'real',
    badge: '🥩 불판대참사',
    badgeType: 'badge-chaos',
    name: '옆 테이블 불판 쟁탈전',
    message: '옆 테이블 고기 익는 소리가 더 웅장하고 맛있어 보인다고 손님들이 서로 불판이 더 탐난다며 젓가락으로 기싸움을 벌이기 시작했습니다. 판 갈아드릴 테니 진정하세요...'
  },
  {
    category: 'real',
    badge: '🚨 실화냐',
    badgeType: 'badge-real',
    name: '냉면 겨자 폭격기',
    message: '손님이 "겨자 많이 쳐주세요" 하시길래 넉넉히 둘러드렸더니 한 입 드시자마자 손님의 만성 비염과 축농증이 3초 만에 뻥 뚫리며 완치 판정을 받으셨습니다.'
  },
  {
    category: 'real',
    badge: '🥩 불판대참사',
    badgeType: 'badge-chaos',
    name: '삼겹살 1인분의 위엄',
    message: '혼자 오신 손님이 "삼겹살 딱 1인분만 되나요?" 하셔서 살포시 올려드렸는데, 30분 뒤 볶음밥 3개와 된장찌개 뚝배기, 소주 4병을 깔끔하게 클리어하고 가셨습니다. 대단한 승부사...'
  },
  {
    category: 'real',
    badge: '🚨 실화냐',
    badgeType: 'badge-real',
    name: '쌈장 무한리필 미스터리',
    message: '쌈장을 무려 6번이나 리필해가신 손님이 있었는데, 나중에 치울 때 보니까 고기는 한 점도 쌈장에 안 찍어 드셨습니다. 도대체 쌈장 어디로 증발한 건가요?'
  },
  {
    category: 'real',
    badge: '🥩 불판대참사',
    badgeType: 'badge-chaos',
    name: '삼겹살 주문했는데 등심 나감',
    message: '손님이 삼겹살 2인분을 시켰는데 주방 실수로 한우 투뿔 등심이 나갔습니다. 손님이 "여기 돼지고기가 소고기 맛이 나네" 하면서 감탄하며 드심. 노란소 드디어 오픈하나?.'
  },
  {
    category: 'real',
    badge: '🚨 실화냐',
    badgeType: 'badge-real',
    name: '황금빛 그릴러의 비극',
    message: '내가 집게 잡고 구울 땐 겉바속촉 미슐랭 3스타 육즙 폭발인데, 손님한테 집게 넘겨드리는 순간 3분 만에 석탄 연성술사로 전직하십니다. 왜 그러시는 거예요...'
  },

  // --- [3] 알바 눈물썰 (alba) ---
  {
    category: 'alba',
    badge: '😭 알바눈물',
    badgeType: 'badge-sad',
    name: '단톡방 공주님 대참사',
    message: '여자친구한테 보낼 문자를 실수로 매장 단톡방에 보냈습니다.. "웅 공주님 잘 잤어요? 점심은 챙겨 먹었고?" ...점장님 답장: "공주님 오늘 삼겹살 50인분 발골해야 하니까 10분 일찍 출근하세요."'
  },
  {
    category: 'alba',
    badge: '💀 주방괴담',
    badgeType: 'badge-sad',
    name: '서울대생의 비애',
    message: '주방 이모님이 설거지 산더미를 보시더니 "야! 불판 닦을 힘으로 공부했으면 서울대 갔다!" 하심... "이모님 저 서울대 휴학하고 온 건데요...?" 매장에 정적 10초 흐름.'
  },
  {
    category: 'alba',
    badge: '😭 알바눈물',
    badgeType: 'badge-sad',
    name: '양파절임의 눈물',
    message: '양파를 썰다가 눈물이 멈추지 않아서 엉엉 울고 있는데 주방 이모가 "너 실연당했냐?" 물어보셨다. "아뇨 양파가 너무 매워서요..." "그래 울지 말고 더 썰어라, 3박스 남았다."'
  },
  {
    category: 'alba',
    badge: '😭 알바눈물',
    badgeType: 'badge-sad',
    name: '지하철 삼겹살 테러범',
    message: '알바 끝나고 밤 11시 막차 탔는데, 온몸에 밴 삼겹살 냄새 때문에 다이어트 중이던 옆자리 승객이 고통스러운 눈빛으로 절 째려보셨습니다. 죄송해요 저도 배고파요...'
  },
  {
    category: 'alba',
    badge: '😭 알바눈물',
    badgeType: 'badge-sad',
    name: '사라진 내 장우산',
    message: '비 오는 날 퇴근하려는데 우산꽂이에 꽂아둔 내 비싼 암막 장우산은 감쪽같이 사라지고, 살대 3개 부러진 너덜너덜한 투명 비닐우산 하나만 외롭게 남아있었습니다.'
  },
  {
    category: 'alba',
    badge: '😭 알바눈물',
    badgeType: 'badge-sad',
    name: '창고 5분 파워냅',
    message: '음료수 박스 가지러 창고 들어갔다가 너무 피곤해서 박스 더미 사이에 쭈그리고 앉아 5분간 기절하듯 잠들었습니다. 깨어났는데 점장님이랑 눈 마주침.'
  },
  {
    category: 'alba',
    badge: '😭 알바눈물',
    badgeType: 'badge-sad',
    name: '영혼의 팁 0원',
    message: '오늘 손님한테 고기 구워드리고, 반찬 계속 챙겨드리고, 말동무까지 30분 해드렸는데 가실 때 "학생 오늘 너무 고마워~ 마음으로 팁 줄게!" 하고 가셨습니다. 제 통장엔 마음이 안 찍혀요...'
  },
  {
    category: 'alba',
    badge: '😭 알바눈물',
    badgeType: 'badge-sad',
    name: '불판 집게 다이빙',
    message: '손님 불판 정성껏 갈아드리다가 불판 집게가 뜨거운 숯불 한가운데로 다이빙했습니다. 숯불 집게 구하기 퀘스트가 강제 시작되었습니다.'
  },

  // --- [4] 킹받는 넌센스 (nonsense) ---
  {
    category: 'nonsense',
    badge: '🤣 킹받음',
    badgeType: 'badge-nonsense',
    name: '돼지가 방귀를 뀌면?',
    message: '돼지가 방귀를 뀌면? 돈까스... 라고 생각하셨나요? 유감스럽게도 지금 환풍기 닥트 역류 중입니다. 즉시 대피하십시오.'
  },
  {
    category: 'nonsense',
    badge: '🤣 킹받음',
    badgeType: 'badge-nonsense',
    name: '세상에서 가장 슬픈 돼지',
    message: '세상에서 가장 슬픈 돼지는 무엇일까요? ...노란돼지 마감 1분 전에 문 열고 들어오는 회식 단체 15명을 창문 너머로 바라보는 내 얼굴.'
  },
  {
    category: 'nonsense',
    badge: '🤣 킹받음',
    badgeType: 'badge-nonsense',
    name: '왕이 고깃집에 가면?',
    message: '조선의 왕이 고깃집에 가면 어떻게 주문할까요? ..."짐이 삼겹살을 명하노라." ...죄송합니다, 분노를 가라앉히시고 [다른 농담 뽑기]를 눌러주세요.'
  },
  {
    category: 'nonsense',
    badge: '🤣 킹받음',
    badgeType: 'badge-nonsense',
    name: '소주를 가장 빨리 마시는 방법',
    message: '소주를 가장 빠르게 마시는 방법은? ...계산할 때 동전 1,450원짜리 잔돈 세고 계신 손님 뒤에서 기다리며 원샷하기.'
  },
  {
    category: 'nonsense',
    badge: '🤣 킹받음',
    badgeType: 'badge-nonsense',
    name: '고기가 덜 익었을 때 대처법',
    message: '고기가 덜 익었을 때 어떻게 해야 할까요? 고기한테 정중하게 "아직 덜 익으셨네요, 따뜻하게 더 구워드리겠습니다"라고 양해를 구하세요. 고기는 맛있어질 권리가 있습니다.'
  },
  {
    category: 'nonsense',
    badge: '🤣 킹받음',
    badgeType: 'badge-nonsense',
    name: '알바생의 투시 능력',
    message: '알바 3개월 차가 되면 손님이 문 손잡이를 잡는 순간 "저분은 삼겹살 3인분에 공기밥 2개 시킬 관상이다"가 80% 확률로 보이기 시작합니다.'
  },
  {
    category: 'nonsense',
    badge: '🤣 킹받음',
    badgeType: 'badge-nonsense',
    name: '노란돼지의 미스터리',
    message: '왜 이름이 노란돼지일까요? 핑크색 돼지가 너무 열심히 일하다가 황달이 와서 노란색이 되었다는 소문이 있습니다... 믿거나 말거나.'
  },

  // --- [5] 퇴근 & 마감 잔혹사 (escape) ---
  {
    category: 'escape',
    badge: '🍺 칼퇴실패',
    badgeType: 'badge-escape',
    name: '퇴근 30초 전 기적',
    message: '가방 메고 외투 다 입고 지문 찍으려는 순간, 문 딸랑 열리며 "혹시 지금 삼겹살 돼요?" 사장님의 입꼬리가 귀에 걸리며 제 백팩을 살포시 벗겨주셨습니다.'
  },
  {
    category: 'escape',
    badge: '🍺 마감잔혹사',
    badgeType: 'badge-escape',
    name: '바닥 슬릭타이어 드리프트',
    message: '마감할 때 바닥 기름때 닦으려고 퐁퐁물 뿌렸는데, 슬리퍼 신고 있던 알바생 셋이 동시에 슬릭 타이어 장착하고 카운터까지 드리프트로 활주했습니다.'
  },
  {
    category: 'escape',
    badge: '🍺 마감잔혹사',
    badgeType: 'badge-escape',
    name: '음쓰 봉투 대폭발',
    message: '마감 때 음식물 쓰레기 봉투 꽉 채워서 들고 나가다가 밑바닥이 "펑" 터졌습니다. 그 순간 인생의 모든 기억이 주마등처럼 3초간 스쳐 지나갔습니다.'
  },
  {
    category: 'escape',
    badge: '🍺 칼퇴실패',
    badgeType: 'badge-escape',
    name: '윈도우 업데이트 1%',
    message: '마감하고 포스기 끄려는데 [Windows 업데이트 구성 중 1%... 컴퓨터를 끄지 마십시오]가 떴습니다. 그렇게 강제로 매장에 20분 추가 체류.'
  },
  {
    category: 'escape',
    badge: '🍺 칼퇴실패',
    badgeType: 'badge-escape',
    name: '월요일 저녁의 악몽',
    message: '월요일 저녁, 손님이 1팀밖에 없는데 그 한 팀이 소주 6병을 드시며 새벽 3시까지 안 나가십니다. 사장님과 둘이서 눈으로 대화했습니다.'
  },
  {
    category: 'escape',
    badge: '🍺 마감잔혹사',
    badgeType: 'badge-escape',
    name: '가스 밸브 환청 증후군',
    message: '마감 다 하고 문 잠그고 버스 정류장까지 걸어갔는데 "잠깐, 나 주방 밸브 잠갔나?" 불안해서 다시 매장으로 전력 질주. 확인해보니 당연히 잠겨있음.'
  },
  {
    category: 'escape',
    badge: '🍺 마감잔혹사',
    badgeType: 'badge-escape',
    name: '포스기 정산 초기화 공포',
    message: '포스기 마감 정산 버튼 누르려다가 실수로 "전체 데이터 초기화" 팝업을 띄웠습니다. 순간 심장 박동수 180bpm 찍고 식은땀 1리터 흘림.'
  },
  {
    category: 'escape',
    badge: '🍺 칼퇴성공',
    badgeType: 'badge-escape',
    name: '알바비 입금의 기적',
    message: '마감 청소 끝나고 땀 닦고 있는데 띠링- 알바비 입금 알림이 울렸습니다. 오늘 겪은 모든 고통과 분노가 1초 만에 치유되고 이번 주말 약속 프리패스권을 획득했습니다! 🥳'
  }
];

const DeveloperJokeCard = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const currentUserId = user?.userIdx || 1;
  const currentUserName = user?.name || user?.userId || '노란돼지 크루';

  // 커스텀 농담 목록 상태
  const [customJokes, setCustomJokes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 전체 농담 풀 (커스텀 등록 농담 + 기본 시드 농담)
  const allJokes = useMemo(() => {
    return [...customJokes, ...funnyJokes];
  }, [customJokes]);

  const [currentJoke, setCurrentJoke] = useState(() => {
    const randomIndex = Math.floor(Math.random() * funnyJokes.length);
    return funnyJokes[randomIndex];
  });
  const [isRolling, setIsRolling] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  // 농담 등록 / 수정 모달 상태
  const [showJokeModal, setShowJokeModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingJoke, setEditingJoke] = useState(null);
  const [jokeForm, setJokeForm] = useState({
    name: '',
    message: '',
    category: 'wtf',
    badge: '🚨 실화냐',
    badgeType: 'badge-real',
    emojiIdx: 0,
    isAnonymous: true
  });

  // 커스텀 농담 로딩
  const loadCustomJokes = useCallback(async () => {
    try {
      const data = await jokeApi.getJokes();
      setCustomJokes(data);
    } catch (e) {
      console.error('커스텀 농담 조회 실패:', e);
    }
  }, []);

  useEffect(() => {
    loadCustomJokes();
  }, [loadCustomJokes]);

  // 카테고리별 필터링 목록
  const filteredJokes = useMemo(() => {
    if (selectedCategory === 'all') return allJokes;
    return allJokes.filter((joke) => joke.category === selectedCategory);
  }, [selectedCategory, allJokes]);

  // 카테고리 변경 시
  const handleCategorySelect = (catId) => {
    setSelectedCategory(catId);
    let candidates = allJokes;
    if (catId !== 'all') {
      candidates = allJokes.filter((j) => j.category === catId);
    }
    if (candidates.length > 0) {
      const randomItem = candidates[Math.floor(Math.random() * candidates.length)];
      setCurrentJoke(randomItem);
      setAnimKey((prev) => prev + 1);
    }
  };

  // 랜덤 농담 뽑기
  const getRandomJoke = () => {
    setIsRolling(true);
    setTimeout(() => setIsRolling(false), 450);

    const pool = filteredJokes.length > 0 ? filteredJokes : allJokes;
    if (pool.length === 1) {
      setCurrentJoke(pool[0]);
      setAnimKey((prev) => prev + 1);
      return;
    }

    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * pool.length);
    } while (pool[newIndex].name === currentJoke.name);

    setCurrentJoke(pool[newIndex]);
    setAnimKey((prev) => prev + 1);
  };

  // 농담 클립보드 복사
  const handleCopyJoke = async () => {
    const textToCopy = `[노란돼지 오늘의 농담 - ${currentJoke.badge}]\n${currentJoke.name}\n"${currentJoke.message}"`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // 농담 작성 모달 열기
  const openCreateModal = () => {
    setEditingJoke(null);
    setJokeForm({
      name: '',
      message: '',
      category: 'wtf',
      badge: '🚨 실화냐',
      badgeType: 'badge-real',
      emojiIdx: 0,
      isAnonymous: true
    });
    setShowEmojiPicker(false);
    setShowJokeModal(true);
  };

  // 농담 수정 모달 열기
  const openEditModal = (joke) => {
    setEditingJoke(joke);
    setJokeForm({
      name: joke.name,
      message: joke.message,
      category: joke.category || 'wtf',
      badge: joke.badge || '🚨 실화냐',
      badgeType: joke.badgeType || 'badge-real',
      emojiIdx: joke.emojiIdx || 0,
      isAnonymous: Boolean(joke.isAnonymous)
    });
    setShowEmojiPicker(false);
    setShowJokeModal(true);
  };

  // 농담 저장 (등록/수정)
  const handleSaveJoke = async (e) => {
    e.preventDefault();
    if (!jokeForm.name.trim() || !jokeForm.message.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    try {
      let saved;
      if (editingJoke) {
        saved = await jokeApi.updateJoke(editingJoke.id, jokeForm);
      } else {
        saved = await jokeApi.createJoke({
          ...jokeForm,
          authorName: jokeForm.isAnonymous ? '익명의 돼지 🐷' : currentUserName,
          userIdx: currentUserId
        });
      }
      setShowJokeModal(false);
      await loadCustomJokes();
      if (saved) {
        setCurrentJoke(saved);
        setAnimKey((prev) => prev + 1);
      }
    } catch (err) {
      console.error('농담 저장 실패:', err);
      alert('농담 저장 중 오류가 발생했습니다.');
    }
  };

  // 농담 삭제 (논리적 삭제)
  const handleDeleteJoke = async (jokeId) => {
    if (!window.confirm('정말 이 농담을 삭제하시겠습니까?')) return;
    try {
      await jokeApi.deleteJoke(jokeId);
      await loadCustomJokes();
      // 다른 농담으로 전환
      const remaining = allJokes.filter((j) => j.id !== jokeId);
      if (remaining.length > 0) {
        setCurrentJoke(remaining[Math.floor(Math.random() * remaining.length)]);
      }
      setAnimKey((prev) => prev + 1);
    } catch (err) {
      console.error('농담 삭제 실패:', err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const jokeIndex = allJokes.findIndex((j) => j.name === currentJoke.name) + 1;
  const currentCategoryObj = CATEGORIES.find((c) => c.id === currentJoke.category);
  const isOwner = currentJoke.userIdx && Number(currentJoke.userIdx) === Number(currentUserId);

  return (
    <div className="joke-page-wrapper py-4 px-3">
      <Container className="joke-card-container">
        {/* 상단 네비게이션 & 브랜드 헤더 */}
        <header className="joke-topbar">
          <button
            type="button"
            className="joke-back-btn"
            onClick={() => navigate(-1)}
            aria-label="이전 페이지로 돌아가기"
          >
            <RiArrowLeftLine size={16} />
            <span>돌아가기</span>
          </button>

          <div className="joke-topbar-actions">
            <button
              type="button"
              className="joke-create-btn"
              onClick={openCreateModal}
              title="새로운 꿀잼 썰이나 농담 등록하기"
            >
              <RiAddLine size={15} />
              <span>농담 등록</span>
            </button>

            <div className="joke-header-badge">
              <span className="badge-dot" />
              <RiSparklingLine size={13} />
              <span>돼지들의 쉼터</span>
            </div>
          </div>
        </header>

        {/* 카테고리 필터 탭 */}
        <nav className="joke-categories-bar" aria-label="농담 카테고리 선택">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`joke-category-chip ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => handleCategorySelect(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </nav>

        {/* 메인 히어로 카드 */}
        <main
          key={animKey}
          className="joke-main-card joke-anim-pop"
        >
          {/* 카드 상단 메타 정보 */}
          <div className="joke-card-meta">
            <span className={`joke-tag-badge ${currentJoke.badgeType || 'badge-real'}`}>
              {currentJoke.badge}
            </span>

            <div className="d-flex align-items-center gap-2">
              {currentCategoryObj && (
                <span className="badge bg-light text-dark border py-1 px-2 fw-semibold" style={{ fontSize: '0.78rem' }}>
                  {currentCategoryObj.label}
                </span>
              )}
              {isOwner && (
                <span className="badge bg-success-subtle text-success border border-success-subtle py-1 px-2 fw-semibold" style={{ fontSize: '0.78rem' }}>
                  내 농담
                </span>
              )}
              <span className="joke-index-tag">
                № {jokeIndex > 0 ? jokeIndex : 1} / {allJokes.length}
              </span>
            </div>
          </div>

          {/* 농담 제목 */}
          <h1 className="joke-title">
            {currentJoke.name}
          </h1>

          {/* 본문 메시지 (인용구 스타일) */}
          <div className="joke-message-box">
            <RiDoubleQuotesL size={32} className="joke-quote-icon" />
            <p className="joke-message-text">
              {currentJoke.message}
            </p>
          </div>

          {/* 본인 농담일 경우 수정/삭제 버튼 */}
          {isOwner && currentJoke.id && (
            <div className="d-flex justify-content-end gap-2 mb-3">
              <Button
                variant="outline-secondary"
                size="sm"
                className="rounded-pill py-1 px-3 d-flex align-items-center gap-1"
                style={{ fontSize: '0.8rem' }}
                onClick={() => openEditModal(currentJoke)}
              >
                <RiEdit2Line size={13} /> 수정
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                className="rounded-pill py-1 px-3 d-flex align-items-center gap-1"
                style={{ fontSize: '0.8rem' }}
                onClick={() => handleDeleteJoke(currentJoke.id)}
              >
                <RiDeleteBinLine size={13} /> 삭제
              </Button>
            </div>
          )}

          {/* 액션 컨트롤 버튼들 */}
          <div className="joke-actions">
            <button
              type="button"
              className={`btn-joke-random ${isRolling ? 'rolling' : ''}`}
              onClick={getRandomJoke}
            >
              <RiDiceLine size={20} className="dice-icon" />
              <span>다른 농담 뽑기</span>
            </button>

            <button
              type="button"
              className={`btn-joke-copy ${isCopied ? 'copied' : ''}`}
              onClick={handleCopyJoke}
            >
              {isCopied ? <RiCheckLine size={18} /> : <RiFileCopyLine size={18} />}
              <span>{isCopied ? '복사 완료! 🎉' : '농담 복사하기'}</span>
            </button>
          </div>

          {/* 복사 성공 시 인라인 알림 */}
          {isCopied && (
            <div className="text-center">
              <span className="joke-toast-feedback">
                <RiCheckLine size={15} /> 클립보드에 복사되었습니다. 동료들과 공유해보세요!
              </span>
            </div>
          )}
        </main>

        {/* 하단 위트 있는 응원 메시지 푸터 (유저 지정 문구 보존) */}
        <footer className="joke-footer-note">
          <p className="fw-semibold">
            ☕ 오늘도 뜨거운 불판 앞과 주방에서 고군분투하는 여러분을 응원합니다.
          </p>
          <p className="text-muted small">
            노란돼지 고기 굽는 개발자 올림
          </p>
        </footer>
      </Container>

      {/* =========================================================
          농담 등록 / 수정 모달
         ========================================================= */}
      <Modal
        show={showJokeModal}
        onHide={() => setShowJokeModal(false)}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold fs-5">
            {editingJoke ? '농담 수정하기' : '새로운 농담 / 썰 등록'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveJoke}>
          <Modal.Body className="gathering-modal-body pt-3">
            {/* 이모지 및 카테고리 선택 */}
            <div className="d-flex gap-3 mb-3">
              <Form.Group style={{ width: '80px' }}>
                <Form.Label className="small fw-bold">이모지</Form.Label>
                <div>
                  <button
                    type="button"
                    className="joke-emoji-trigger w-100"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    title="이모지 변경"
                  >
                    {getEmojiByIdx(jokeForm.emojiIdx)}
                  </button>
                </div>
              </Form.Group>

              <Form.Group className="flex-grow-1">
                <Form.Label className="small fw-bold">카테고리</Form.Label>
                <Form.Select
                  value={jokeForm.category}
                  onChange={(e) => setJokeForm({ ...jokeForm, category: e.target.value })}
                >
                  {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>

            {/* 이모지 선택 팔레트 팝오버 */}
            {showEmojiPicker && (
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small fw-bold text-muted">이모지 선택 (총 {EMOJI_LIST.length}종)</span>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-muted"
                    onClick={() => setShowEmojiPicker(false)}
                  >
                    닫기
                  </button>
                </div>
                <div className="joke-emoji-palette">
                  {EMOJI_LIST.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`joke-emoji-item ${jokeForm.emojiIdx === idx ? 'active' : ''}`}
                      onClick={() => {
                        setJokeForm({
                          ...jokeForm,
                          emojiIdx: idx,
                          badge: `${emoji} ${jokeForm.badge.replace(/^[^\s]+\s*/, '') || '실화냐'}`
                        });
                        setShowEmojiPicker(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 뱃지 이름 */}
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">뱃지 키워드</Form.Label>
              <Form.Control
                type="text"
                placeholder="예: 🚨 실화냐, 🤯 뇌정지, 🥩 불판대참사"
                value={jokeForm.badge}
                onChange={(e) => setJokeForm({ ...jokeForm, badge: e.target.value })}
                maxLength={20}
                required
              />
            </Form.Group>

            {/* 농담 제목 */}
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">제목</Form.Label>
              <Form.Control
                type="text"
                placeholder="농담이나 썰의 제목을 입력하세요"
                value={jokeForm.name}
                onChange={(e) => setJokeForm({ ...jokeForm, name: e.target.value })}
                maxLength={60}
                required
              />
            </Form.Group>

            {/* 농담 본문 내용 */}
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">농담 / 썰 내용</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="어이없고 빵 터지는 썰이나 농담을 자유롭게 적어주세요!"
                value={jokeForm.message}
                onChange={(e) => setJokeForm({ ...jokeForm, message: e.target.value })}
                required
              />
            </Form.Group>

            {/* 익명 체크 */}
            <Form.Group className="mb-1">
              <Form.Check
                type="checkbox"
                id="joke-anon-check"
                label="익명으로 남기기 (익명의 돼지 🐷)"
                className="fw-semibold user-select-none"
                checked={Boolean(jokeForm.isAnonymous)}
                onChange={(e) => setJokeForm({ ...jokeForm, isAnonymous: e.target.checked })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button
              variant="outline-secondary"
              size="sm"
              className="rounded-pill px-3"
              onClick={() => setShowJokeModal(false)}
            >
              취소
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              className="rounded-pill px-4 fw-bold"
            >
              {editingJoke ? '수정 완료' : '등록하기'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default DeveloperJokeCard;