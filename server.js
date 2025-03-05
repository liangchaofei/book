const fs = require("fs");
const path = require("path");

// 设置 macOS 上的书签文件路径
const bookmarkPath = path.join(
  process.env.HOME,
  "Library/Application Support/Google/Chrome/Default/Bookmarks"
);
// 设置目标 JSON 文件路径
const jsonFolderPath = path.join(process.cwd(), "json");
const pinTreeJsonPath = path.join(jsonFolderPath, "pintree.json");

// 确保目标文件夹存在，如果不存在则创建
if (!fs.existsSync(jsonFolderPath)) {
  fs.mkdirSync(jsonFolderPath);
}

// 检查路径是否存在
if (!fs.existsSync(bookmarkPath)) {
  console.error("Bookmarks file not found at:", bookmarkPath);
  process.exit(1);
}

// 获取 favicon URL 的函数
const getFaviconURL = (url) => {
  try {
    const { origin } = new URL(url);
    return `https://logo.clearbit.com/${origin}`;
  } catch (err) {
    console.error("Invalid URL:", url);
    return "";
  }
};

// 递归遍历书签树，提取书签数据
const extractBookmarks = (node) => {
  let bookmarks = [];

  if (node.type === "url") {
    const faviconUrl = getFaviconURL(node.url);
    bookmarks.push({
      type: "link",
      addDate: node.date_added * 1000, // 转换成毫秒
      title: node.name,
      icon: faviconUrl,
      url: node.url,
    });
  } else if (node.type === "folder" && node.children) {
    const folder = {
      type: "folder",
      addDate: node.date_added * 1000, // 转换成毫秒
      title: node.name,
      children: [],
    };
    node.children.forEach((child) => {
      folder.children = folder.children.concat(extractBookmarks(child));
    });
    bookmarks.push(folder);
  }

  return bookmarks;
};

// 读取书签文件
fs.readFile(bookmarkPath, "utf8", (err, data) => {
  if (err) {
    console.error("Error reading bookmarks file:", err);
    return;
  }

  try {
    const bookmarksData = JSON.parse(data);
    const bookmarksBar = bookmarksData.roots.bookmark_bar;

    const bookmarks = [
      {
        type: "folder",
        addDate: bookmarksBar.date_added * 1000, // 转换成毫秒
        title: bookmarksBar.name,
        children: extractBookmarks(bookmarksBar),
      },
    ];

    console.log("Formatted Bookmarks:", bookmarks);

    // 写入书签数据到当前目录的 json/pintree.json 文件中（覆盖写入）
    fs.writeFile(
      pinTreeJsonPath,
      JSON.stringify(bookmarks, null, 2),
      (writeErr) => {
        if (writeErr) {
          console.error("Error writing to pinetree.json:", writeErr);
          return;
        }
        console.log("Bookmarks data has been written to pinetree.json");
      }
    );
  } catch (parseErr) {
    console.error("Error parsing bookmarks file:", parseErr);
  }
});
