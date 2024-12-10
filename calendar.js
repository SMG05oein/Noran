let currentMonth = new Date().getMonth(); // 현재 월
let currentYear = new Date().getFullYear(); // 현재 년도

// 현재 월과 년도에 맞는 캘린더 그리기
function renderCalendar() {
    const calendarContainer = document.getElementById('calendar');
    const monthYearElement = document.getElementById('monthYear');

    // 월/년 표시
    monthYearElement.textContent = `${currentYear}년 ${currentMonth + 1}월`;

    const firstDay = new Date(currentYear, currentMonth, 1); // 첫날
    const lastDay = new Date(currentYear, currentMonth + 1, 0); // 마지막 날
    const daysInMonth = lastDay.getDate(); // 한 달의 일 수
    const startDay = firstDay.getDay(); // 첫날의 요일

    // 테이블 초기화
    let calendarHTML = '<table><thead><tr>';
    const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

    // 요일 추가
    daysOfWeek.forEach(day => {
        calendarHTML += `<th>${day}</th>`;
    });

    calendarHTML += '</tr></thead><tbody><tr>';

    // 첫 날 전까지 빈 칸 추가
    for (let i = 0; i < startDay; i++) {
        calendarHTML += '<td class="disabled"></td>';
    }

    // 날짜 표시
    for (let day = 1; day <= daysInMonth; day++) {
        // 일한 날짜는 파란색 표시
        let worked = false;
        // 예시로 10일과 20일에 근무했다고 가정
        if (day === 10 || day === 20) {
            worked = true;
        }

        if (worked) {
            calendarHTML += `<td class="worked">${day}</td>`;
        } else {
            calendarHTML += `<td>${day}</td>`;
        }

        // 주말이면 줄 바꿈
        if ((startDay + day) % 7 === 0) {
            calendarHTML += '</tr><tr>';
        }
    }

    calendarHTML += '</tr></tbody></table>';
    calendarContainer.innerHTML = calendarHTML;
}

// 월을 변경하는 함수 (이전/다음)
function changeMonth(direction) {
    currentMonth += direction;

    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }

    renderCalendar(); // 캘린더 다시 그리기
}

// 페이지 로드 시 캘린더 그리기
window.onload = renderCalendar;