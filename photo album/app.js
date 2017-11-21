'use strict';
// 引入express框架
const express = require('express');
// 解析post请求体数据的包
const bodyParser = require('body-parser');
// 文件功能增强的包
const fse = require('fs-extra');
// 解析上传文件的包
const formidable = require('formidable');
// 引入path核心对象
const path = require('path');

// 引入数据库对象
const mysql = require('mysql');
const pool = mysql.createPool({
  connectionLimit: 10,
  host: '127.0.0.1',
  user: 'root',
  password: '914',
  database: 'album'
});

// 创建服务器
let app = express();
// 配置模板引擎
app.engine('html', require('express-art-template'));
// 配置路由规则
let router = express.Router();
// 测试路由
router.get('/test', (req, res, next) => {
    pool.getConnection(function (err, connection) {
      connection.query('select * from album_dir', function (error, results, fields) {
        // 查询完毕释放连接
        connection.release();
        if (error) throw error;
        res.render('test.html', {
          text: results[2].dir
        })
      })
    })
  })

  // 首页
  .get('/', (req, res, next) => {
    // 获取数据库连接
    pool.getConnection(function (err, connection) {
      // 处理获取连接时的异常
      if (err) return next(err);
      // 使用连接查询所有的数据
      connection.query('select * from album_dir', (error, results) => {
        // 查询完毕释放连接
        connection.release();
        // 处理查询时的异常
        if (err) return next(err);
        // 响应页面
        res.render('index.html', {
          album: results
        })
      })
    })
  })

  // 相片展示
  .get('/showDir', (req, res, next) => {
    // 获取url上查询的字符串
    let dirname = req.query.dir;
    // 获取数据库连接
    pool.getConnection((err, connection) => {
      // 处理获取连接时的异常
      if (err) return next(err);
      // 使用连接查询所有的数据
      connection.query('select * from album_file where dir =?', [dirname], (error, results) => {
        // 查询完毕释放连接
        connection.release();
        // 处理查询时的异常
        if (err) return next(err);
        // 响应页面及数据
        res.render('album.html', {
          // 便于从数据库中获取图片地址
          album: results,
          // 用于辨别是往那个相册里面添加图片
          // 隐藏域提交相册信息
          dir: dirname
        })
      })
    })
  })

  // 添加相册
  .post('/addDir', (req, res, next) => {
    // 获取请求的
    let dirname = req.body.dirname;
    // 获取数据库连接
    pool.getConnection((err, connection) => {
      // 处理获取连接时的异常
      if (err) return next(err);
      // 使用连接查询所有的数据
      connection.query('insert into album_dir values (?)', [dirname], (error, results) => {
        // 查询完毕释放连接
        connection.release();
        // 处理查询时的异常
        if (err) return next(err);
        // 重定向 相当于刷新了本页面显示了最新的数据
        res.redirect('/showDir?dir=' + dirname);
        // 创建本地文件夹
        const dir = `./resource/${dirname}`;
        // 确保目录存在
        fse.ensureDir(dir, err => {

        })
      })
    })
  })
  .post('/addPic', (req, res, next) => {
    var form = new formidable.IncomingForm();

    // 获取resource文件夹路径
    let rootPath = path.join(__dirname, 'resource');
    // 设置默认上传目录
    form.uploadDir = rootPath;
    form.parse(req, function (err, fields, files) {
      if (err) return next(err);
      // console.log(fields); // 将提交的请求dir=abcd字符串转换成了对象
      // console.log(files); // 包含上传文件的详细信息
      let filename = path.parse(files.pic.path).base;
      //console.log(filename); // 上传的文件,这个第三方包已经将文件改成了二进制文件

      // 拼接并修正路径 
      let dist = path.join(rootPath, fields.dir, filename);
      // 移动文件 从默认保存的目录 移动到我们设置好的目录中
      fse.move(files.pic.path, dist, (err) => {
        if (err) return next(err);
        // 图片路径
        let db_file = `/resource/${fields.dir}/${filename}`;
        // 提交过来的相册名字 dir=xxx
        let db_dir = fields.dir;
        pool.getConnection((err, connection) => {
          // 处理获取连接时的异常
          if (err) return next(err);
          // 将数据添加到数据库中
          connection.query('insert into album_file values (?,?)', [db_file, db_dir], (error, results) => {
            // 查询完以后,释放连接
            connection.release();
            // 处理查询带来的异常
            if (err) return next(err);
            // 重定向到相片展示页面
            res.redirect('showDir?dir=' + db_dir);
          })
        })
      })
    })
  })
// 处理静态资源
app.use('/public', express.static('./public')); // 如果请求的时以public开头那么就将public目录下的文件暴露
// 暴露相片静态资源目录
app.use('/resource', express.static('./resource'));
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
  extended: false
}));
// parse application/json
app.use(bodyParser.json());
// 中间件执行列表
app.use(router);
// 错误处理中间件
app.use((err, req, res, next) => {
  console.log('程序错误-------------');
  console.log(err);
  res.send(
    `你访问的页面去旅游了,请稍后再试........
      <a href="/">点击跳转到首页</a>
    `
  )
})
app.listen(8888, () => {
  console.log('服务器启动了');
});