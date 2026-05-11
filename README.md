# 🚤 ボートレース予想AI

ボートレース公式サイトから出走表・展示データを自動取得し、Claude AIで予想するWebアプリです。

## 機能

- 🏟 **出走表・展示データ自動取得** - 場・レース番号を選ぶだけで公式サイトからデータ取得
- 🤖 **AI予想** - Claude AIが出走表・展示タイム・オッズを分析して予想
- ⚙️ **予想傾向カスタマイズ** - イン重視・波乱狙いなど4スタイル＋重視度調整
- 📋 **予想履歴** - 自動保存・フィルタリング
- 📊 **的中率トラッカー** - 結果記録・場別集計

## セットアップ

### 1. 依存パッケージをインストール

```bash
npm install
```

### 2. 環境変数を設定

`.env.local` ファイルを作成：

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
```

### 3. ローカル起動

```bash
# フロントエンド（別ターミナル）
npm run dev

# Vercel Functions のローカルテスト
npx vercel dev
```

## Vercel へのデプロイ（無料）

### 1. GitHubにpush

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/あなたのID/boatrace-ai.git
git push -u origin main
```

### 2. Vercelと連携

1. [vercel.com](https://vercel.com) にアクセス
2. "New Project" → GitHubリポジトリを選択
3. **Environment Variables** に以下を追加：
   - `ANTHROPIC_API_KEY` = あなたのAnthropicのAPIキー

### 3. Deploy！

"Deploy" ボタンを押すだけで自動ビルド＆公開されます。

## ファイル構成

```
/
├── api/
│   ├── race.js        # 出走表・展示・オッズ取得API
│   ├── chat.js        # Claude AI チャットAPI（APIキー管理）
│   └── schedule.js    # 本日の開催場一覧API
├── src/
│   ├── main.jsx       # Reactエントリポイント
│   └── App.jsx        # メインアプリ（全機能）
├── index.html
├── vite.config.js
├── vercel.json        # Vercel設定
└── package.json
```

## 注意事項

- ボートレース公式サイトのデータ取得はアクセス頻度に注意してください
- 予想はあくまで参考情報です。的中を保証するものではありません
- 投票は自己責任でお楽しみください
