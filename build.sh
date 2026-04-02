#!/bin/bash
# FluxSQL 构建脚本 - 零依赖，纯 Shell
# 用途：将 src/ 目录中的多个文件合并为 dist/index.html 单文件

echo "🔨 开始构建 FluxSQL..."

# 清空并创建 dist 目录
rm -rf /Applications/workspace/FluxSQL/github/dist
mkdir -p /Applications/workspace/FluxSQL/github/dist

# 路径变量
SRC_DIR="/Applications/workspace/FluxSQL/github/src"
DIST_FILE="/Applications/workspace/FluxSQL/github/dist/index.html"

# 读取 HTML 头部（到 <link> 标签之后，</head> 之前）
HTML_HEAD=$(sed -n '1,9p' "$SRC_DIR/index.html")

# 读取 CSS 内容（style.css 现在是纯 CSS 文件）
CSS_CONTENT=$(cat "$SRC_DIR/css/style.css")

# 读取 HTML body 内容（从 <body> 到 </body> 之间的内容）
HTML_BODY=$(sed -n '/<body>/,/<\/body>/p' "$SRC_DIR/index.html" | sed '1d;$d')

# 读取并合并 JS 文件（按依赖顺序）
JS_FILES=(
  "config.js"
  "utils.js"
  "dialect.js"
  "sql.js"
  "ai.js"
  "history.js"
  "editor.js"
  "app.js"
)

JS_CONTENT=""
for file in "${JS_FILES[@]}"; do
  JS_PATH="$SRC_DIR/js/$file"
  if [ -f "$JS_PATH" ]; then
    JS_CONTENT+=$'\n\n'
    JS_CONTENT+="// ========== $file =========="
    JS_CONTENT+=$'\n'
    JS_CONTENT+=$(cat "$JS_PATH")
  else
    echo "⚠️  警告：文件 $file 不存在，跳过"
  fi
done

# 组装最终 HTML
{
  echo "$HTML_HEAD"
  echo "<style>"
  echo "$CSS_CONTENT"
  echo "</style>"
  echo "</head>"
  echo "<body>"
  echo "$HTML_BODY"
  echo "<script>"
  echo "$JS_CONTENT"
  echo "</script>"
  echo "</body>"
  echo "</html>"
} > "$DIST_FILE"

# 获取文件大小
FILE_SIZE=$(wc -c < "$DIST_FILE")

echo "✅ 构建完成！"
echo "📁 输出文件: $DIST_FILE"
echo "📊 文件大小: $FILE_SIZE 字节"
echo ""
echo "🚀 使用方法："
echo "   开发: 编辑 src/ 目录中的文件"
echo "   构建: ./build.sh"
echo "   运行: 双击 dist/index.html"
