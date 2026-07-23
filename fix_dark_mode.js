const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend/src');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walk(dirPath, callback);
        } else if (dirPath.endsWith('.js') || dirPath.endsWith('.jsx')) {
            callback(dirPath);
        }
    });
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Badges / pills
    content = content.replace(/'bg-purple-100 text-purple-800'/g, "'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300'");
    content = content.replace(/'bg-green-100 text-green-800'/g, "'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'");
    content = content.replace(/'bg-blue-100 text-blue-800'/g, "'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'");
    content = content.replace(/bg-purple-100 text-purple-800/g, "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300");
    content = content.replace(/bg-green-100 text-green-800(?! dark)/g, "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300");
    content = content.replace(/bg-blue-100 text-blue-800(?! dark)/g, "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300");

    // "Your Reply:" and task replies
    content = content.replace(/text-green-700 italic/g, "text-green-700 dark:text-green-300 italic");
    content = content.replace(/text-green-600 mt-2/g, "text-green-600 dark:text-green-400 mt-2");
    
    // Table dividers
    content = content.replace(/divide-gray-200(?! dark)/g, "divide-gray-200 dark:divide-slate-700");

    // Table headers text
    content = content.replace(/text-gray-500 dark:text-slate-400/g, "text-gray-500 dark:text-slate-300");

    // Other missing dark texts
    content = content.replace(/text-gray-700(?! dark)/g, "text-gray-700 dark:text-slate-300");
    content = content.replace(/text-gray-600(?! dark)/g, "text-gray-600 dark:text-slate-300");
    content = content.replace(/text-slate-600(?! dark)/g, "text-slate-600 dark:text-slate-300");
    
    // Borders
    content = content.replace(/border-gray-200(?! dark)/g, "border-gray-200 dark:border-slate-700");

    // Fix duplicate dark mode overrides if any
    content = content.replace(/dark:text-slate-300 dark:text-slate-\d00/g, "dark:text-slate-300");
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    }
}

walk(srcDir, processFile);
console.log('Done!');
