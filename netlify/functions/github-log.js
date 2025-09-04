const https = require('https');

exports.handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const { empno, action, details } = JSON.parse(event.body);
    
    const log = {
      empno,
      action,
      details,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleString('ko-KR')
    };

    // GitHub API 호출
    const response = await fetch(`https://api.github.com/repos/bsens90-wq/patient-guide-logs/contents/logs/user_logs.json`, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Netlify-Function'
      }
    });

    let existingLogs = [];
    let sha = null;

    if (response.ok) {
      const data = await response.json();
      sha = data.sha;
      const content = Buffer.from(data.content, 'base64').toString();
      existingLogs = JSON.parse(content);
    }

    existingLogs.push(log);

    const newContent = Buffer.from(JSON.stringify(existingLogs, null, 2)).toString('base64');

    const updateResponse = await fetch(`https://api.github.com/repos/bsens90-wq/patient-guide-logs/contents/logs/user_logs.json`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Netlify-Function'
      },
      body: JSON.stringify({
        message: `Add log: ${action} by ${empno}`,
        content: newContent,
        sha: sha,
        branch: 'main'
      })
    });

    if (!updateResponse.ok) {
      throw new Error('GitHub API 오류');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
