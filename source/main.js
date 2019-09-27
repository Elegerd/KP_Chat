const net = require('net');
const url = require('url');
const path = require('path');
const {app, BrowserWindow, Menu} = require('electron');

let mainWindow = null;
let socketClient = null;
let HOST = 'localhost';
let PORT = 3000;


function createWindow() {
    // Создаем окно браузера.
    mainWindow = new BrowserWindow({
      width: 900,
      height: 600,
      title: "Chat",
      autoHideMenuBar: true,
    });

    // и загружаем index.html в приложение.
    mainWindow.loadURL(url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true
    }));

    // Генерируется когда окно закрыто.
    mainWindow.on('closed', function() {
        // Сброс объекта окна, обычно нужен когда вы храните окна
        // в массиве, это нужно если в вашем приложении множество окон,
        // в таком случае вы должны удалить соответствующий элемент.
        mainWindow = null;
    });
    // Отображаем средства разработчика.
    mainWindow.webContents.openDevTools()
}

// Этот метод будет вызван когда Electron закончил
// инициализацию и готов к созданию окна браузера.
app.on('ready', createWindow);

// Выйти, после того как все окна будут закрыты.
app.on('window-all-closed', function() {
    // В OS X это характерно для приложений и их меню,
    // чтобы оставаться активными, пока пользователь явно не завершит работу
    // при помощи Cmd + Q
    if (process.platform != 'darwin') {
        app.quit();
    }
});

app.on('activate', function() {
   // На MacOS обычно пересоздают окно в приложении,
   // после того, как на иконку в доке нажали и других открытых окон нету.
  if (mainWindow === null) {
    createWindow();
  }
});

console.log('Try to connect');
socketClient = net.connect(PORT, HOST,  () => {
    socketClient.write('Connected to server!');
});

socketClient.on('close', () => {
    console.log('Disconnected from server');
});

socketClient.on('data', (data) => {
    console.log(data.toString());
});

socketClient.on('error', (err) => {
    console.error(err);
});