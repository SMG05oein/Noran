// const express = require('express');
// const bodyParser = require('body-parser');
// const { google } = require('googleapis');
// const cors = require('cors');
// const path = require('path'); // 경로 설정을 위한 패키지
//
// const app = express();
// const PORT = process.env.PORT || 3000;
//
// // Middleware 설정
// app.use(cors());
// app.use(bodyParser.json());
//
// // Google Sheets API 설정
// const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// const credentialsPath = path.resolve(__dirname, 'credentials.json'); // 절대 경로 설정
//
// const auth = new google.auth.GoogleAuth({
//     keyFile: credentialsPath, // 파일 경로 설정
//     scopes: SCOPES,
// });
//
// const sheets = google.sheets({ version: 'v4', auth });
//
// // Google 스프레드시트 ID (실제 Google 스프레드시트의 ID로 변경)
// const SHEET_ID = '1mQFhQA3YokfaG0_kj4HleNC08s4pa6ZJ1QYR1Cb9FQo';
//
// // POST API 엔드포인트
// app.post('/recordWorkHours', async (req, res) => {
//     const { name, startTime, endTime, workHours } = req.body;
//
//     if (!name || !startTime || !endTime || !workHours) {
//         console.error('필드 누락: ', req.body);
//         return res.status(400).json({ success: false, message: '모든 필드를 입력해야 합니다.' });
//     }
//
//     try {
//         // Google Sheets에 데이터 추가
//         await sheets.spreadsheets.values.append({
//             spreadsheetId: SHEET_ID,
//             range: 'Sheet1!A1', // 올바른 범위 설정
//             valueInputOption: 'USER_ENTERED',
//             requestBody: {
//                 values: [[name, startTime, endTime, workHours]],
//             },
//         });
//
//         res.json({ success: true, message: '근무 시간이 기록되었습니다.' });
//     } catch (error) {
//         console.error('Google Sheets API 오류:', error); // 에러 로깅을 더 자세히 출력
//         res.status(500).json({ success: false, message: 'Google Sheets 기록 중 오류가 발생했습니다.', error: error.message });
//     }
// });
//
// // 서버 시작
// app.listen(PORT, () => {
//     console.log(`서버가 http://localhost:${PORT}에서 실행 중입니다.`);
// });

const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Google Sheets API 설정
const credentials = require('./credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.GoogleAuth({
    keyFile: './credentials.json',
    scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });

// 스프레드시트 ID
const SHEET_ID = '1mQFhQA3YokfaG0_kj4HleNC08s4pa6ZJ1QYR1Cb9FQo'; // Google 스프레드시트 ID 입력
// POST API 엔드포인트
app.post('/recordWorkHours', async (req, res) => {
    const { name, startTime, endTime, workHours } = req.body;

    if (!name || !startTime || !endTime || !workHours) {
        console.error('필드 누락: ', req.body);
        return res.status(400).json({ success: false, message: '모든 필드를 입력해야 합니다.' });
    }

    try {
        // Google Sheets에 데이터 추가
        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: 'Sheet1!A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[name, startTime, endTime, workHours]],
            },
        });

        res.json({ success: true, message: '근무 시간이 기록되었습니다.' });
    } catch (error) {
        console.error('Google Sheets API 오류:', error.message);
        res.status(500).json({ success: false, message: 'Google Sheets 기록 중 오류가 발생했습니다.' });
    }
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT}에서 실행 중입니다.`);
});