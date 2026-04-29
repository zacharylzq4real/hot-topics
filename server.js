const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.')); // 托管当前目录下的静态文件

// 知乎热榜
app.get('/api/zhihu', async (req, res) => { 
    try { 
        // 使用 api.zhihu.com 接口，因为它不需要登录认证，比 v3 接口更稳定
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
            // 保持用户要求的 URL 替换逻辑
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
        res.json(data); 
    } catch (e) { 
        console.error('知乎 API 请求失败:', e.message);
        // 如果是 401 错误，说明接口需要验证，这里返回一个友好的错误提示
        res.status(e.response?.status || 500).json({ 
            error: '获取失败', 
            message: e.message 
        }); 
    } 
});

// 微博热搜
const WEIBO_API = 'https://weibo.com/ajax/statuses/hot_band';
app.get('/api/weibo', async (req, res) => {
    try {
        const response = await axios.get(WEIBO_API, {
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

        res.json(data);
    } catch (error) {
        console.error('微博 API 请求失败:', error.message);
        res.status(500).json({ error: '获取失败', message: error.message });
    }
});

function formatHotNum(num) {
    if (!num) return '';
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    }
    return num.toString();
}

app.listen(PORT, () => {
    console.log(`🔥 热榜 API 服务已启动: http://localhost:${PORT}`);
    console.log(`📌 知乎热榜: http://localhost:${PORT}/api/zhihu`);
    console.log(`📌 微博热搜: http://localhost:${PORT}/api/weibo`);
});
