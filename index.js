'use strict';
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 格式化微博热度
function formatHotNum(num) {
    if (!num) return '';
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    }
    return num.toString();
}

exports.main_handler = async (event, context) => {
    // 获取请求路径
    let requestPath = event.path;
    const method = event.httpMethod;

    // 默认响应头（包含 CORS）
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // 处理 OPTIONS 请求（CORS 预检）
    if (method === 'OPTIONS') {
        return {
            isBase64Encoded: false,
            statusCode: 204,
            headers: headers,
            body: ''
        };
    }

    try {
        // 路由分发
        if (requestPath === '/api/zhihu') {
            headers['Content-Type'] = 'application/json';
            // 知乎热榜逻辑
            const response = await axios.get('https://api.zhihu.com/topstory/hot-list', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Host': 'api.zhihu.com'
                },
                timeout: 10000
            });

            if (!response.data || !response.data.data) {
                throw new Error('知乎接口返回数据格式异常');
            }

            const data = response.data.data.map(item => {
                let url = item.target.url;
                if (url) {
                    url = url.replace('api.zhihu.com/questions', 'www.zhihu.com/question');
                } else {
                    url = `https://www.zhihu.com/question/${item.target.id}`;
                }

                return {
                    title: item.target.title,
                    url: url,
                    hot: item.detail_text || ''
                };
            });

            return {
                isBase64Encoded: false,
                statusCode: 200,
                headers: headers,
                body: JSON.stringify(data)
            };

        } else if (requestPath === '/api/weibo') {
            headers['Content-Type'] = 'application/json';
            // 微博热搜逻辑
            const response = await axios.get('https://weibo.com/ajax/statuses/hot_band', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Referer': 'https://weibo.com/hot/search'
                },
                timeout: 10000
            });

            const rawData = response.data;
            if (rawData.ok !== 1) {
                throw new Error(rawData.msg || '微博接口返回错误');
            }

            const data = (rawData.data?.band_list || []).map((item, index) => ({
                rank: index + 1,
                title: item.word,
                url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word)}`,
                hot: formatHotNum(item.num),
                category: item.label_name || ''
            }));

            return {
                isBase64Encoded: false,
                statusCode: 200,
                headers: headers,
                body: JSON.stringify(data)
            };

        } else if (requestPath === '/' || requestPath === '/index.html') {
            // 返回首页静态文件
            const htmlPath = path.join(__dirname, 'index.html');
            if (fs.existsSync(htmlPath)) {
                const content = fs.readFileSync(htmlPath, 'utf8');
                headers['Content-Type'] = 'text/html; charset=utf-8';
                return {
                    isBase64Encoded: false,
                    statusCode: 200,
                    headers: headers,
                    body: content
                };
            }
        }

        // 404 路由
        headers['Content-Type'] = 'application/json';
        return {
            isBase64Encoded: false,
            statusCode: 404,
            headers: headers,
            body: JSON.stringify({ error: 'Not Found', path: requestPath })
        };

    } catch (e) {
        console.error('API 请求失败:', e.message);
        headers['Content-Type'] = 'application/json';
        return {
            isBase64Encoded: false,
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({
                error: '获取失败',
                message: e.message
            })
        };
    }
};

