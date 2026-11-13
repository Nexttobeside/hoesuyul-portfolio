# 회수율 포트폴리오 계산기

가진 미국 주식과 ETF를 넣으면 포트폴리오 전체의 회수율과 성장률, 3·5·7년 뒤 회수율, 목표에 맞추는 비중을 계산하는 정적 웹앱입니다.
서버가 없고, 넣은 내용은 각자의 브라우저(localStorage)에만 저장됩니다.

## 파일

| 파일 | 하는 일 | 고칠 때 |
| --- | --- | --- |
| `index.html`, `app.css` | 화면 틀과 모양 | 디자인을 바꿀 때 |
| `config.js` | Finnhub 키, 블로그 주소, 글 번호 | 키를 바꾸거나 소개 글 번호가 생겼을 때 |
| `data.js` | 종목 데이터(블로그 카드와 같은 숫자) | **카드를 교체할 때마다** 새 파일로 바꿉니다. 직접 고치지 않습니다 |
| `engine.js`, `lp.js` | 계산(회수율, 목표 맞추기, 매수 계획) | 계산 규칙이 바뀔 때 |
| `charts.js`, `store.js`, `app.js`, `app2.js` | 그림, 저장·시세, 화면 | 기능을 더할 때 |

## GitHub Pages에 올리기 (처음 한 번)

1. GitHub에서 새 저장소를 만듭니다. 이름 예: `hoesuyul-portfolio`, 공개(Public).
2. 저장소의 **Add file → Upload files**에서 이 폴더 안의 파일을 모두(폴더 없이 한곳에) 끌어다 놓고 **Commit changes**.
3. **Settings → Pages → Build and deployment**에서 Source를 **Deploy from a branch**, Branch를 **main / (root)**로 고르고 Save.
4. 1~2분 뒤 `https://<계정 이름>.github.io/hoesuyul-portfolio/` 로 열립니다.

## 데이터 바꾸기 (카드를 교체했을 때)

Claude가 만들어 준 새 `data.js`를 저장소의 `data.js`에 덮어씁니다(저장소에서 `js` 폴더 → Add file → Upload files → 같은 이름으로 올리기).

## 시세 키

`config.js`의 `finnhubKey`는 페이지를 여는 사람 누구에게나 보입니다. 무료 키는 분당 60회까지 쓸 수 있고 방문자 전체가 나눠 씁니다.
방문자가 많아져 시세가 자주 끊기면 Finnhub 대시보드에서 키를 다시 만들고, 중계 서버(Cloudflare Worker 등)로 바꾸는 것을 검토합니다.

이 계산기는 투자 권유가 아니며, 투자 판단과 그 책임은 본인에게 있습니다.
