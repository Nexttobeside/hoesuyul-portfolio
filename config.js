/* 사이트 설정. 운영자가 고치는 파일은 이것 하나다. */
window.HS_CONFIG = {
  // Finnhub 무료 키(https://finnhub.io). 비워 두면 카드 기준일 종가로 계산하고, 방문자가 설정에서 자기 키를 넣을 수 있다.
  finnhubKey: 'dbr80kpr01qij0hiabg0dbr80kpr01qij0hiabgg',
  // 블로그 글 주소: blogBase + 글 번호
  blogBase: 'https://gseek.pe.kr/?p=',
  basicsPost: 9722,   // 회수율 기초글
  methodPost: 9725,   // 회수율 계산 기준 글
  toolPost: null,     // 이 도구를 소개하는 글(발행 뒤 번호를 넣는다)
  // 주가를 다시 받는 간격(분). 무료 키는 분당 60회라 너무 짧게 두지 않는다.
  refreshMinutes: 5
};
