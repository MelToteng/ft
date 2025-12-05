# Finance Tracker

A modern, full-featured personal finance application built with React, Supabase, and AI integration. Track your income, expenses, and budgets with a beautiful, responsive UI and get intelligent financial insights powered by Google Gemini.

## ✨ Key Features

- **📊 Interactive Dashboard**: Get a real-time overview of your financial health with income/expense tracking, balance trends, and spending breakdowns.
- **💰 Budget Planner**: Set and manage monthly budgets for different categories with a streamlined, multi-select interface.
- **📝 Transaction Management**: Easily add, edit, and delete income and expense transactions.
- **🔄 Recurring Transactions**: Automate your regular bills and subscriptions.
- **🏷️ Custom Categories**: Create and manage your own transaction categories to suit your lifestyle.
- **📥 Import & Export**: Seamlessly import transactions from CSV/PDF and export your data for external analysis.
- **🤖 AI Financial Insights**: Receive personalized financial advice and spending analysis powered by Google Gemini AI.
- **📱 Mobile-Responsive**: Fully optimized for all devices, from desktops to mobile phones.
- **🔐 Secure Authentication**: Robust user authentication and data security via Supabase.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Backend & Database**: Supabase (PostgreSQL, Auth, Realtime)
- **Charts & Visualization**: Recharts
- **AI Integration**: Google Gemini API
- **Icons**: Lucide React (custom implementation)

## 🚀 Run Locally

**Prerequisites:**
- Node.js (v16+)
- A Supabase project
- A Google Cloud Project with Gemini API access

### 1. Clone the repository
```bash
git clone <repository-url>
cd finance-tracker
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory and add the following keys:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 4. Setup Database
Run the SQL script provided in `sql/` folder in your Supabase project's SQL Editor to set up the necessary tables and security policies.

### 5. Run the application
```bash
npm run dev
```

Open [https://mfintrk.netlify.app/] to view deployed version on the browser.

## 📄 License

[MIT](https://choosealicense.com/licenses/mit/)
