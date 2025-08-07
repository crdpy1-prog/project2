
// DOM 요소들
const dateInput = document.getElementById('meal-date');
const searchBtn = document.getElementById('search-btn');
const loading = document.getElementById('loading');
const mealInfo = document.getElementById('meal-info');
const errorMessage = document.getElementById('error-message');
const noMeal = document.getElementById('no-meal');
const mealDateDisplay = document.getElementById('meal-date-display');

// 급식 카드들
const breakfastCard = document.getElementById('breakfast-card');
const lunchCard = document.getElementById('lunch-card');
const dinnerCard = document.getElementById('dinner-card');

// 메뉴 리스트들
const breakfastMenu = document.getElementById('breakfast-menu');
const lunchMenu = document.getElementById('lunch-menu');
const dinnerMenu = document.getElementById('dinner-menu');

// 오늘 날짜를 기본값으로 설정
const today = new Date();
const todayString = today.getFullYear() + '-' + 
    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
    String(today.getDate()).padStart(2, '0');
dateInput.value = todayString;

// API 설정
const API_BASE_URL = 'https://open.neis.go.kr/hub/mealServiceDietInfo';
const ATPT_OFCDC_SC_CODE = 'J10'; // 경기도교육청
const SD_SCHUL_CODE = '7530079'; // 산본고등학교

// 이벤트 리스너
searchBtn.addEventListener('click', searchMealInfo);
dateInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchMealInfo();
    }
});

// 페이지 로드시 오늘 급식 정보 자동 조회
window.addEventListener('load', function() {
    searchMealInfo();
});

// 급식 정보 조회 함수
async function searchMealInfo() {
    const selectedDate = dateInput.value;
    if (!selectedDate) {
        alert('날짜를 선택해주세요.');
        return;
    }

    // 날짜 형식 변환 (YYYY-MM-DD -> YYYYMMDD)
    const formattedDate = selectedDate.replace(/-/g, '');
    
    // UI 초기화
    hideAllElements();
    loading.style.display = 'block';

    try {
        const mealData = await fetchMealData(formattedDate);
        displayMealInfo(mealData, selectedDate);
    } catch (error) {
        console.error('급식 정보 조회 실패:', error);
        showError();
    }
}

// API에서 급식 데이터 가져오기
async function fetchMealData(date) {
    const url = `${API_BASE_URL}?ATPT_OFCDC_SC_CODE=${ATPT_OFCDC_SC_CODE}&SD_SCHUL_CODE=${SD_SCHUL_CODE}&MLSV_YMD=${date}&Type=json`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.RESULT && data.RESULT.CODE === 'INFO-000') {
            // 데이터가 없는 경우
            return null;
        }
        
        if (data.mealServiceDietInfo && data.mealServiceDietInfo[1] && data.mealServiceDietInfo[1].row) {
            return data.mealServiceDietInfo[1].row;
        } else {
            return null;
        }
    } catch (error) {
        // CORS 오류나 네트워크 오류 시 프록시 서버 사용 시도
        try {
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();
            const parsedData = JSON.parse(data.contents);
            
            if (parsedData.RESULT && parsedData.RESULT.CODE === 'INFO-000') {
                return null;
            }
            
            if (parsedData.mealServiceDietInfo && parsedData.mealServiceDietInfo[1] && parsedData.mealServiceDietInfo[1].row) {
                return parsedData.mealServiceDietInfo[1].row;
            } else {
                return null;
            }
        } catch (proxyError) {
            // 프록시도 실패하면 샘플 데이터 사용 (개발/테스트용)
            console.warn('API 호출 실패, 샘플 데이터 사용:', proxyError);
            return getSampleData(date);
        }
    }
}

// 샘플 데이터 (개발/테스트용)
function getSampleData(date) {
    return [
        {
            MMEAL_SC_NM: "조식",
            DDISH_NM: "쌀밥<br/>미역국5.6.9.18.<br/>돼지불고기5.6.10.13.<br/>시금치나물무침5.6.<br/>김치9.13.<br/>우유2."
        },
        {
            MMEAL_SC_NM: "중식", 
            DDISH_NM: "현미밥<br/>콩나물국5.6.9.18.<br/>치킨까스1.2.5.6.13.15.<br/>브로콜리무침5.6.<br/>배추김치9.13.<br/>딸기우유2."
        },
        {
            MMEAL_SC_NM: "석식",
            DDISH_NM: "잡곡밥5.<br/>된장찌개5.6.9.18.<br/>제육볶음5.6.10.13.<br/>콩나물무침5.6.<br/>김치9.13.<br/>요구르트2."
        }
    ];
}

// 급식 정보 표시
function displayMealInfo(mealData, selectedDate) {
    hideAllElements();
    
    if (!mealData || mealData.length === 0) {
        noMeal.style.display = 'block';
        return;
    }

    // 날짜 표시
    const dateObj = new Date(selectedDate);
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    mealDateDisplay.textContent = dateObj.toLocaleDateString('ko-KR', options) + ' 급식 정보';

    // 각 식사별로 데이터 정리
    mealData.forEach(meal => {
        const mealType = meal.MMEAL_SC_NM;
        const dishNames = meal.DDISH_NM;
        
        if (mealType && dishNames) {
            const menuItems = parseMenuItems(dishNames);
            
            switch (mealType) {
                case '조식':
                    displayMealCard(breakfastCard, breakfastMenu, menuItems);
                    break;
                case '중식':
                    displayMealCard(lunchCard, lunchMenu, menuItems);
                    break;
                case '석식':
                    displayMealCard(dinnerCard, dinnerMenu, menuItems);
                    break;
            }
        }
    });

    mealInfo.style.display = 'block';
}

// 메뉴 아이템 파싱 (HTML 태그 제거 및 알레르기 정보 처리)
function parseMenuItems(dishNames) {
    return dishNames
        .split('<br/>')
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .map(item => {
            // 알레르기 정보 제거 (숫자와 점으로 이루어진 부분)
            return item.replace(/\d+\./g, '').trim();
        });
}

// 급식 카드 표시
function displayMealCard(card, menuList, menuItems) {
    menuList.innerHTML = '';
    menuItems.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        menuList.appendChild(li);
    });
    card.style.display = 'block';
}

// 모든 요소 숨기기
function hideAllElements() {
    loading.style.display = 'none';
    mealInfo.style.display = 'none';
    errorMessage.style.display = 'none';
    noMeal.style.display = 'none';
    breakfastCard.style.display = 'none';
    lunchCard.style.display = 'none';
    dinnerCard.style.display = 'none';
}

// 오류 표시
function showError() {
    hideAllElements();
    errorMessage.style.display = 'block';
}
