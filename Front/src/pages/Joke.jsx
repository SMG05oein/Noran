import React, { useState } from 'react';
import { Card, Button } from 'react-bootstrap';
import { RiCupLine } from 'react-icons/ri';

// 밈과 비표준 HTTP 코드를 담은 농담 리스트
const devJokes = [
    // --- [1 ~ 20] 고깃집 & 불판 특화 밈 ---
    { code: 400, name: "Bad Order (주문 불일치)", message: "손님은 '목살 2인분'이라 는데 포스기엔 '삼겹살 3인분'으로 찍혀서 점장님한테 혼났습니다." },
    { code: 401, name: "Unauthenticated (민증 미지참)", message: "교복 입은 손님이 성숙해 보인다고 하셔서 민증 까보라고 했더니 도망갔습니다. ?!?!?" },
    { code: 403, name: "Forbidden (불판 사수)", message: "손님이 '알바생이 직접 구워주세요' 시전했지만 난 퇴근 했는데...ㅠ" },
    { code: 404, name: "Table Not Found", message: "분명이 40번 테이블에 김치 구워드리러 갔는데 40번 테이블은 없습니다. 나폴리탄 괴담인가?" },
    { code: 408, name: "Request Timeout (고기 탐)", message: "다른 테이블 서빙하느라 정신 팔린 사이, 3번 테이블 목살이 시커먼 숯검댕이가 되었습니다." },
    { code: 409, name: "Conflict (불판 싸움)", message: "옆 테이블 불판이 더 탐난다고 손님들이 서로 불판 쟁탈전을 벌이고 있습니다. 이건 어떻게 대처를 해야하지" },
    { code: 410, name: "Gone (예약..?)", message: "금요일 황금 시간대 10명 단체 예약이 '노쇼'를 시전했습니다." },
    { code: 418, name: "I'm a Teapot (주전자 아님)", message: "손님이 '여기 따뜻한 소주 주세요'를 하였지만 난 찻주전자인걸..." },
    { code: 422, name: "Unprocessable Entity (말귀 오해)", message: "손님이 '불 좀 빼주세요' 해서 불판을 통째로 들고 튀려 했습니다." },
    { code: 429, name: "Too Many Requests (너무 많은 요청)", message: "좌우 앞뒤로 동시에 '여기요!', '사장님!', '공기밥 추가요!'가 터져 나와 뇌가 다운되었습니다." },

    { code: 500, name: "Internal Pork Error", message: "손님이 삼겹살을 주문했는데 소등심이 나갔습니다. 아니 잠만 이게 가능해?" },
    { code: 501, name: "Not Implemented (비밀 메뉴)", message: "단골 손님이 '여기는 왜 짜파게티 안 팔아요?' 해서 당황했습니다." },
    { code: 502, name: "Bad Gateway (환풍구 고장)", message: "테이블 위 환풍구 닥트가 고장 나서 삼겹살 연기가 매장 전체를 뒤덮었습니다." },
    { code: 503, name: "Service Unavailable (삼겹살 품절)", message: "오늘 회식 손님이 너무 많이 와서 삽겹살이 쇼트났습니다." },
    { code: 504, name: "Gateway Timeout (주문 누락)", message: "주문 포스기에 찍었는데 주방 영수증이 밀려서 손님이 30분째 물냉면만 기다리는 중입니다." },
    { code: 507, name: "Insufficient Storage (위장 폭발)", message: "2명이서 고기 10인분 먹고 된장찌개 뚝배기 들어갈 공간이 없습니다." },
    { code: 520, name: "Meat counter Returned an Unknown Meat(육부에서 알 수 없는 고기를 줌)", message: "처음 보는 고기인데 뭐죠?" },
    { code: 521, name: "Boss Is AWOL (사장님 잠적)", message: "사장님이 집에 갔어요..." },
    { code: 522, name: "Menu Board Glare", message: "손님이 메뉴판에 등심 가격이 안 보인다고 눈을 찌르고 있습니다. 여기는 돼지 고기집이라고!!" },
    { code: 523, name: "Trash Can Full", message: "마감 직전인데 음쓰통이 쌓여서 쓰레기통이 터지기 직전입니다." },

    // --- [21 ~ 50] 알바생 생고생 & 서비스 밈 ---
    { code: 600, name: "Go Home (칼퇴 기원)", message: "라스트 오더 10분 전, 손님이 새로 들어와서 고기를 주문했습니다." },
    { code: 601, name: "Soju Shower", message: "맥주 뚜껑을 따다가 뚜껑이 튕겨서 잡으려다 옆 테이블 손님 옷에 시원하게 쏟았습니다." },
    { code: 602, name: "Tongs Drop", message: "뜨겁게 달궈진 고기 집게를 바닥에 떨어뜨려 온 매장이 쿵 소리로 시끄러워졌습니다." },
    { code: 603, name: "Apron Stain", message: "손님에게 된장찌개를 서빙하다가 하얀색 명품 패딩에 국물이 튀었습니다." },
    { code: 604, name: "Table Wipe Failure", message: "테이블을 닦았는데 기름때가 안 지워져서 행주로 3번 넘게 빡빡 닦는 중입니다." },
    { code: 605, name: "It Works On My Grill", message: "내가 구울 땐 완벽한 노란빛이었는데 손님이 구우면 시꺼먼 숯덩이가 됩니다." },
    { code: 606, name: "Infinite Dishwashing", message: "싱크대에 쌓인 설거지 그릇이 세탁기 드럼세탁기 마냥 끝없이 불어납니다." },
    { code: 607, name: "Legacy Smoke Smell", message: "알바 끝나고 집에 갈 때 옷에 밴 삼겹살 냄새 때문에 지하철 사람들이 피합니다. 이건 좋은데!" },
    { code: 608, name: "Floor Slip Danger", message: "고깃집 바닥 특유의 기름기 때문에 스케이트 타듯 미끄러져 퇴근할 뻔 했습니다." },
    { code: 609, name: "Friday Night Hell", message: "금요일 저녁 피크타임, 만석에 웨이팅까지 걸려서 영혼이 육체와 이탈했습니다." },

    { code: 610, name: "Order Chaos", message: "어느 테이블이 계란찜 서비스였는지 기억이 안 나서 매장을 방황하고 있습니다." },
    { code: 611, name: "Sudden Menu Change", message: "고기 다 구워놨더니 손님이 '아, 우리 항정 말고 삼겹이었어요'라고 말했습니다." },
    { code: 612, name: "No Receipt Please", message: "계산할 때 손님이 '영수증 버려주세요' 했는데 포스기엔 영수증이 이미 길게 뽑혀 나왔습니다." },
    { code: 613, name: "AI Grill Helper Missing", message: "삼겹살 자동 뒤집기 로봇이 없어서 내 팔목이 너덜너덜해졌습니다." },
    { code: 614, name: "Cooler Freezer Jam", message: "음료수 냉장고 안에서 콜라 캔이 꽁꽁 얼어붙어 터져 버렸습니다." },
    { code: 615, name: "Garlic Burnout", message: "참기름에 마늘을 넣고 불판에 올렸는데 잠시 눈 감은 사이 마늘 종지가 전소되었습니다. 우리는 마늘 그렇게 구우면 안 되는데" },
    { code: 616, name: "Undefined Side Dish", message: "상추가 떨어졌는데 주방에 야채가 다 떨어졌다고 빨간불이 떴습니다." },
    { code: 617, name: "Null Pointer Tip", message: "오늘 서비스 엄청 열심히 했는데 영혼의 팁(0원)을 받았습니다." },
    { code: 618, name: "Button Call Broken", message: "손님이 '여기요!' 호출벨을 50번 눌렀는데 벨 수신기가 먹통이었습니다." },
    { code: 619, name: "Late Night Bus Gone", message: "고깃집 마감 청소까지 싹 하고 나왔더니 이미 버스 끊겨서 택시비로 오늘 알바비가 녹았습니다." },

    // --- [51 ~ 80] 손님 유형별 고통 밈 ---
    { code: 620, name: "Drunk Uncle Loop", message: "취객 손님이 '알바생 총각, 나 젊었을 땐 말이야~' 스토리를 무한 반복 재생 중입니다." },
    { code: 621, name: "Kids Running Riot", message: "꼬마 손님이 매장 안을 전력 질주하며 고기 판 사이를 위협하고 있습니다. 꼬마야 뛰지마.. 다쳐.." },
    { code: 622, name: "Extra Sauce Endless", message: "쌈장을 5번이나 리필해놓고 고기는 한 점도 안 찍어 먹는 손님을 만났습니다. 뭐랑 먹을 걸까요??" },
    { code: 623, name: "Trash On Floor", message: "휴지와 뼈다기를 식탁 위에 산더미처럼 쌓아두고 퇴장하셨습니다." },
    { code: 624, name: "Split Bill Nightmare", message: "대학생 단체 손님 10명이 와서 각각 카드로 10분의 1 결제를 요청했습니다." },
    { code: 625, name: "Ice Water Attack", message: "얼음물 달라고 해서 가져다드렸더니 '얼음이 너무 차갑다'고 항의하십니다." },
    { code: 626, name: "Secret Ingredient Detective", message: "손님이 '이 고기 무슨 숙성 썼어요?' 물어보는데 알바생은 오늘 처음 나와서 모릅니다." },
    { code: 627, name: "Hidden Trash Can", message: "손님이 뼈를 휴지통이 아니라 바닥 구석에 몰래 숨겨두고 갔습니다." },
    { code: 628, name: "Monday Closing Blue", message: "월요일 저녁, 손님이 1팀밖에 없는데 그 한 팀이 새벽 3시까지 안 나갑니다." },
    { code: 629, name: "Sudden Closing Order", message: "마감 직전 1시 50분에 손님이 문을 열고 '혹시 아직 고기 돼요?'라고 물어봅니다." },

    { code: 630, name: "Group Chat Leak", message: "여자친구한테 보낼 문자를 실수로 단톡방에 보냈습니다.. 아 나 오늘 출근 못한다" },
    { code: 631, name: "Uniform Missing", message: "출근했는데 노란돼지 유니폼(앞치마/티셔츠)을 빨래 안 해놓고 안 가져왔습니다." },
    { code: 632, name: "S공포증 (소주 잔돈)", message: "계산할 때 현금 내시면서 잔돈으로 1,450원짜리 동전을 한 움큼 주셨습니다." },
    { code: 633, name: "Power Nap In Storage", message: "창고에 박스 가지러 들어갔다가 너무 졸아서 5분간 바닥에 누워있었습니다." },
    { code: 634, name: "Umbrella Theft", message: "알바 끝나고 가려는데 우산꽂이에 꽂아둔 내 우산이 감쪽같이 사라졌습니다." },
    { code: 635, name: "A/C Heater Conflict", message: "홀은 더운데 주방은 펄펄 끓어서 에어컨을 켜야 할지 사장님 눈치를 봅니다." },
    { code: 636, name: "Review Terrorism Fear", message: "손님이 표정이 안 좋게 나가시길래 네이버 리뷰에 '노란돼지 알바 불친절' 적힐까 봐 두근거립니다." },
    { code: 637, name: "Wi-Fi Password Loop", message: "손님 5명이 3분 간격으로 '와이파이 비밀번호가 뭐예요?' 물어봐서 녹음기 틀고 싶습니다." },
    { code: 638, name: "Energy Drink Overdose", message: "졸음 깨려고 핫식스 두 개를 연속으로 마셨더니 심장이 쿵쾅거려 불판을 못 닦겠습니다." },
    { code: 639, name: "Shoe Sole Melt", message: "불판 주변을 오래 돌아다녔더니 신발 밑창이 열기에 살짝 녹은 느낌입니다." },

    // --- [81 ~ 100] 노란돼지 레전드 마감 밈 ---
    { code: 640, name: "Pantyhose Burn", message: "(해당 없음 - 알바생 바지가 삼겹살 불꽃에 살짝 그슬렸습니다)" },
    { code: 641, name: "Bus Passed", message: "마감 청소 다 끝나고 문 잠그고 나오는데 막차가 정류장을 지나쳐 갑니다." },
    { code: 642, name: "Elevator Locked", message: "출근 해야 하는데 건물 엘리베이터가 고장나서 10층을 걸어서 내려가야 합니다." },
    { code: 643, name: "Late Night Pork Craving", message: "하루 종일 고기 냄새를 맡았는데 퇴근하니까 아이러니하게 삼겹살에 소주가 당깁니다." },
    { code: 644, name: "Table Oil Storm", message: "불판 닦는 철수세미가 찢어져서 손가락에 기름때와 철가루가 세트로 묻었습니다." },
    { code: 645, name: "Tab Closed Accident", message: "포스기 정산 마감 버튼을 잘못 눌러서 오늘 매출이 초기화될 뻔했습니다." },
    { code: 646, name: "Typo in Wage Calc", message: "이번 달 시급 계산해서 통장 찍힌 걸 봤는데 생각보다 너무 달달합니다." },
    { code: 647, name: "Infinite Floor Mop", message: "바닥 기름때를 닦으려고 물걸레질을 세 번이나 했는데 아직도 미끄럽습니다." },
    { code: 648, name: "Gas Valve Check", message: "집에 가려다가 '가스 밸브 잠갔나?' 불안해서 다시 매장으로 뛰어갔습니다." },
    { code: 649, name: "Trash Bag Burst", message: "음식물 쓰레기 봉투를 들고 나가다가 바닥에 터져서 인생 최대 현타가 왔습니다." },

    { code: 650, name: "Salary Bomb", message: "알바비 입금 알림이 울리자마자 이번 주 주말 약속 프리패스권을 획득했습니다." },
    { code: 651, name: "Apron Laundry Missing", message: "내일 입을 옷 세탁을 안 하고 그냥 침대에 던져두고 잠들었습니다." },
    { code: 652, name: "Windows Shutdown Error", message: "포스기 끄려는데 윈도우 업데이트가 갑자기 떠서 퇴근이 10분 지연되었습니다." },
    { code: 653, name: "Salty Stew Emergency", message: "오늘 된장찌개에 베트남 고추 너무 많이 넣어서 손님들이 물을 5병씩 마시고 있습니다." },
    { code: 654, name: "Grill Net Fall", message: "불판 갈아드리다가 불판 집게가 뜨거운 숯불 한가운데로 다이빙했습니다." },
    { code: 655, name: "Infinite Loop of Pork", message: "꿈속에서도 삼겹살 뒤집고 '여기 사이다 하나요!' 외치는 가위바위보 지옥을 겪었습니다." },
    { code: 656, name: "Ram Memory Leak", message: "손님들이 주문한 메뉴를 기억해야 하는데 뇌 메모리가 초과되어 리셋되었습니다." },
    { code: 657, name: "CORS (고기 오지게 구움)", message: "분명히 셀프로 하신다고 했는데 손님들이 고기를 너무 태워서 알바생이 대신 구워주며 수습하는 중입니다." },
    { code: 658, name: "Undefined Manager", message: "매장 일 생겨서 매니저님 찾았더니 휴가 가셔서 연락 두절입니다." },
    { code: 659, name: "SQL Injection (소주 주입)", message: "알바 끝나고 마시는 시원한 카스 맥주 한 잔이 내 몸의 모든 에러를 고쳐줍니다." },
    { code: 666, name: "Satanic Rush Hour", message: "단체 손님 20명이 예약 없이 동시에 들어와서 매장이 순식간에 아수라장이 되었습니다." },
    { code: 670, name: "System Fully Operational", message: "오늘 모든 테이블 마감 깔끔하게 끝내고 사장님이 주시는 보너스 고기와 함께 칼퇴합니다! 🥳" }
];
const DeveloperJokeCard = () => {
    // 랜덤으로 하나의 농담을 고르는 상태
    const [currentJoke, setCurrentJoke] = useState(() => {
        const randomIndex = Math.floor(Math.random() * devJokes.length);
        return devJokes[randomIndex];
    });

    const getRandomJoke = () => {
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * devJokes.length);
        } while (devJokes[newIndex].code === currentJoke.code); // 방금 본 거랑 다른 거 나오게
        setCurrentJoke(devJokes[newIndex]);
    };

    return (
        <Card className="border-0 shadow-sm rounded-4 p-4 text-center bg-light my-4">
            <Card.Body>
                <div className="text-muted small fw-bold mb-2">☕ 오늘의 고기 굽는 개발자의 농담</div>
                <p className="text-secondary mb-4">귀찮아서 디자인 안 함</p>
                <h3 className="fw-bold text-primary mb-2">
                    HTTP {currentJoke.code} : {currentJoke.name}
                </h3>
                <p className="text-secondary mb-4">{currentJoke.message}</p>
                <Button
                    variant="outline-dark"
                    size="sm"
                    className="rounded-pill px-3"
                    onClick={getRandomJoke}
                >
                    다른 농담 뽑기 🎲
                </Button>
            </Card.Body>
        </Card>
    );
};

export default DeveloperJokeCard;