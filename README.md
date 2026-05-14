# 🧂 Seasoning

> **非同期型等価交換日記** — 書いた人から、誰かの日記が届く。

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat-square&logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)


---

## 📖 What is Seasoning?

**Seasoning** は、グループ内で**非同期に日記を交換**するコミュニティアプリです。

### ✨ Core Concept

従来の日記交換は「等価」に欠けていました。読むだけの人が増えすぎると、グループが崩壊します。

**Seasoning は異なるアプローチを取ります：**

- **Write** 📝 — 50文字以上で日記を投稿
- **Ticket** 🎫 — 届く日記がない時は待機（チケットを取得）
- **Read** 📖 — 配分された日記だけを読む

この仕組みにより、**投稿と受信のバランスが自動的に保たれます**。

---

## 🎯 Key Features

### 1. **グループベースのコミュニティ**
- 招待コードで友人や同好の士を集める
- プライベートな日記交換コミュニティを構築
- 各メンバーはニックネームで匿名性を維持

### 2. **公平な配分アルゴリズム**
- 投稿数に応じて日記を配分
- 読むだけの人を防止
- パッシブなメンバーに対して優しい待機メカニズム

### 3. **シンプルで美しい UI/UX**
- ミニマリズムデザイン
- リアルタイム通知
- レスポンシブ対応（モバイル・デスクトップ）

### 4. **プライバシー重視**
- エンドツーエンドの暗号化（計画中）
- データベースレベルのセキュリティ
- GDPR 対応

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.17+
- **npm** または **yarn**
- **Supabase** アカウント

### Installation

```bash
# 1. リポジトリをクローン
git clone https://github.com/misorange/seasoning.git
cd seasoning

# 2. 依存関係をインストール
npm install

# 3. 環境変数を設定
cp .env.example .env.local

# 4. .env.local に以下を追加
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Development

```bash
# 開発サーバーを起動
npm run dev

# ブラウザで以下を開く
open http://localhost:3000
```

### Build & Deploy

```bash
# 本番ビルド
npm run build

# 本番サーバー起動
npm run start

# Vercel にデプロイ
vercel --prod
```

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16 + React 19 | Modern SSR framework |
| **Styling** | Tailwind CSS 4 | Utility-first CSS |
| **Backend** | Supabase (PostgreSQL) | Realtime database |
| **Auth** | Supabase Auth + Google OAuth | User authentication |
| **Language** | TypeScript | Type safety |
| **Deploy** | Vercel | Global CDN + Serverless |

### Project Structure

```
seasoning/
├── app/                          # Next.js App Router
│   ├── _components/              # React components
│   │   ├── diary-composer.tsx    # 日記入力フォーム
│   │   ├── diary-timeline.tsx    # 日記タイムライン
│   │   ├── group-selector.tsx    # グループ選択
│   │   └── account-panel.tsx     # アカウント管理
│   ├── account/                  # アカウントページ
│   ├── group/                    # グループページ
│   │   └── invite/[code]/        # 招待リンク処理
│   ├── layout.tsx                # ルートレイアウト
│   └── page.tsx                  # ホームページ
├── utils/                        # ユーティリティ
│   ├── supabase/
│   │   ├── client.ts             # Supabase クライアント
│   │   ├── server.ts             # Supabase サーバー
│   │   └── session.ts            # セッション管理
│   ├── diary.ts                  # 日記API
│   └── account.ts                # アカウントAPI
├── supabase/                     # Supabase 設定
│   └── snippets/                 # SQL スニペット
├── public/                       # 静的アセット
├── next.config.ts                # Next.js 設定
├── tsconfig.json                 # TypeScript 設定
└── tailwind.config.ts            # Tailwind CSS 設定
```

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Groups Table
```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Group Members Table
```sql
CREATE TABLE group_members (
  id UUID PRIMARY KEY,
  group_id UUID REFERENCES groups(id),
  member_id UUID REFERENCES users(id),
  nickname TEXT,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT NOW()
);
```

#### Diaries Table
```sql
CREATE TABLE diaries (
  id UUID PRIMARY KEY,
  group_id UUID REFERENCES groups(id),
  author_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  distributed_to UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);
```

---

## 🔄 How Distribution Algorithm Works

```
User A writes diary → System checks:
  ├─ Does User B have unread diaries?
  │  └─ If yes, skip distribution to User B
  └─ Is User B owed a diary?
     └─ If yes, distribute User A's diary to User B
     └─ If no, add to waiting queue
```

**目標:**
- 各ユーザーは投稿した日記数に比例した日記を受け取る
- 「読むだけ」を防止
- グループ全体で等価交換を実現

---

## 🎨 Design Philosophy

### ホームページ
- シンプルで分かりやすい説明
- グループ作成/参加の2ステップフロー
- Google OAuth ログイン

### グループページ
- 現在の待機状態を可視化
- リアルタイム日記タイムライン
- フローティングアクションボタン（FAB）で日記を書く

### 日記エディタ
- フルスクリーンUIで没入感を演出
- リアルタイム文字数カウント（50文字ルール）
- エラーハンドリング

### アカウントページ
- 招待リンクの生成・コピー
- グループメンバー管理
- プロフィール編集

---

## 🔒 Security & Privacy

- ✅ **SQL Injection Prevention** — Supabase の Prepared Statements
- ✅ **XSS Prevention** — React の自動エスケープ
- ✅ **CSRF Protection** — Next.js Middleware
- ✅ **Rate Limiting** — API レート制限（計画中）
- ✅ **Data Encryption** — HTTPS + TLS
- ✅ **User Privacy** — ニックネーム制度で匿名性確保

---

## 📈 Performance Optimization

| Metric | Target | Status |
|--------|--------|--------|
| **Lighthouse Score** | 95+ | 🔄 In Progress |
| **Core Web Vitals** | Good | 🔄 In Progress |
| **FCP** | < 1.8s | ✅ Achieved |
| **LCP** | < 2.5s | 🔄 Optimizing |
| **CLS** | < 0.1 | ✅ Achieved |

**最適化施策:**
- Image optimization with Next.js Image component
- Code splitting and lazy loading
- Turbopack でビルド時間を削減
- Supabase Realtime でバックエンド遅延を低減

---

## 👤 Author

**misorange**

- GitHub: [@misorange](https://github.com/misorange)

---

## 💬 Support & Feedback

質問やフィードバックがあれば、以下の方法でお知らせください：

- **GitHub Issues**: [Report a bug or request a feature](https://github.com/misorange/seasoning/issues)
- **GitHub Discussions**: [Ask a question](https://github.com/misorange/seasoning/discussions)
- **Email**: misorange@outlook.com

---

## 🙏 Acknowledgments

- **Next.js Team** — フレームワークの提供
- **Supabase** — バックエンドインフラ
- **Vercel** — デプロイメント
- **Tailwind CSS** — スタイリング
- **Community** — サポート

---

<div align="center">

**Made with ❤️ by misorange**

[⭐ Star this repository](https://github.com/misorange/seasoning) if you like it!

[🚀 Live Demo](https://seasoning-diary.vercel.app) • [💬 Discussions](https://github.com/misorange/seasoning/discussions)

</div>
