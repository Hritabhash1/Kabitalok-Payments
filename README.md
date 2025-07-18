## 💸  Kabitalok Payments
A lightweight, offline-first desktop application built using Tauri, React, and Vite to manage student payments, donations, and expenditures for Kabitalok. It is designed for performance, security, and simplicity, ensuring all data remains on the user's local machine.

## ✨  Key Features
This application provides a robust set of features to streamline financial management:

Student Management: Add, view, and manage detailed student profiles, including photos and contact information.

Payment Tracking: Log individual payment records per student for different terms and academic fields (Painting, Recitation, Singing).

Donation & Expense Tracking: Keep a clear record of all incoming donations and outgoing organizational expenditures.

Financial Assistance: Manage and record financial aid provided to individuals, with role-based access control.

Powerful Reporting: Generate comprehensive financial reports with dynamic time-based filtering:

View data for Today, This Week, This Month, This Year, or All Time.

Drill down into specific months with the "By Month" filter (e.g., "January 2025").

## PDF Generation:

Export detailed summary reports as PDF files, complete with tables for each financial category.

Generate and print individual, dynamically sized receipts for payments, donations, expenditures, and assistance.

Inactive Student Identification: Quickly identify and view a list of students who have not made payments within a selected timeframe (3, 6, or 12 months).

Offline First: All data is stored locally using IndexedDB, ensuring the application is fully functional without an internet connection.

Cross-Platform: Built with Tauri, the application runs natively on Windows, macOS, and Linux.



## Export to Sheets
🚀 Tech Stack
⚛️ React: A JavaScript library for building user interfaces.

⚡ Vite: A next-generation frontend tooling for a fast development experience.

🦀 Tauri: A framework for building tiny, blazing-fast binaries for all major desktop platforms.

🎨 Inline CSS-in-JS: For component-level styling without external CSS files.

📁 Dexie.js: A wrapper for IndexedDB to manage the local database.

📄 jsPDF & jsPDF-AutoTable: For generating client-side PDF documents.

📁 ## Project Structure
kabitalok-payments/
├── public/                  # Static assets
├── src/
│   ├── components/          # Reusable components (e.g., TableSection, Inline forms)
│   ├── pages/               # Application pages (e.g., Reports, StudentPayments)
│   ├── utils/               # Utilities (e.g., db.js for Dexie setup)
│   └── main.jsx             # React application entry point
├── src-tauri/               # Tauri (Rust) configuration and backend code
├── .gitignore
├── package.json
├── vite.config.js
└── README.md
🛠️ Getting Started
Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

## Prerequisites
You need to have Node.js, npm (or yarn/pnpm), and the Tauri prerequisites installed on your system.

Node.js: Download & Install Node.js

Tauri Prerequisites: Follow the official guide for your operating system: tauri.app/v1/guides/getting-started/prerequisites

Installation
Clone the repository:

Bash

git clone https://github.com/your-username/kabitalok-payments.git
Navigate to the project directory:

Bash

cd kabitalok-payments
Install NPM packages:

Bash

npm install
Run the application in development mode:

Bash

npm run tauri dev
This will open the application in a new window with hot-reloading enabled.

## 📦 Building for Production
To create a production-ready, native executable for your platform, run the following command:

Bash

npm run tauri build
The compiled binary/installer will be located in the src-tauri/target/release/ or src-tauri/target/release/bundle/ directory.

## 🤝 Contributing
Contributions are welcome! If you have suggestions for how to improve the app, feel free to fork the repository and submit a pull request.

Fork the Project

Create your Feature Branch (git checkout -b feature/AmazingFeature)

Commit your Changes (git commit -m 'Add some AmazingFeature')

Push to the Branch (git push origin feature/AmazingFeature)

Open a Pull Request

## 📜 License
This project is licensed under the MIT License - see the LICENSE.md file for details.
