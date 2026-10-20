/**
 * 사용자의 생년월일(userBirth)이 오늘과 일치하는지 여부를 판별합니다.
 * userBirth는 문자열('YYYY-MM-DD' 또는 'YYYY-MM-DDTHH:mm:ss') 또는 배열([YYYY, MM, DD]) 형식으로 들어올 수 있습니다.
 * 생년월일이 없거나 형식이 맞지 않으면 false를 반환합니다.
 */
export const isBirthdayToday = (birth) => {
  if (!birth) return false;

  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  let birthMonth = null;
  let birthDay = null;

  if (Array.isArray(birth) && birth.length >= 3) {
    birthMonth = Number(birth[1]);
    birthDay = Number(birth[2]);
  } else if (typeof birth === 'string') {
    const parts = birth.split('T')[0].split('-');
    if (parts.length >= 3) {
      birthMonth = Number(parts[1]);
      birthDay = Number(parts[2]);
    }
  }

  if (!birthMonth || !birthDay) return false;

  return birthMonth === todayMonth && birthDay === todayDay;
};
