// Script to randomize correct answers in all test files
const fs = require('fs');
const path = require('path');

const testFiles = ['html_tests.json', 'css_tests.json', 'js_tests.json', 'git_tests.json', 'bash_tests.json'];

console.log('🔧 Fixing question formats...\n');

testFiles.forEach(fileName => {
  const filePath = path.join(__dirname, 'database', fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${fileName}`);
    return;
  }
  
  console.log(`📝 Processing: ${fileName}`);
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let changedCount = 0;
  
  // Process easy questions
  if (data.easy) {
    data.easy.forEach((question, index) => {
      // If correct answer is always 0, randomize it
      if (question.correct === 0 && question.options && question.options.length === 4) {
        // Randomly choose which position should be correct (0, 1, 2, or 3)
        const newCorrectIndex = Math.floor(Math.random() * 4);
        
        // Swap the correct answer to new position
        const correctAnswer = question.options[0];
        const swappedAnswer = question.options[newCorrectIndex];
        
        question.options[newCorrectIndex] = correctAnswer;
        question.options[0] = swappedAnswer;
        question.correct = newCorrectIndex;
        
        changedCount++;
      }
    });
  }
  
  // Process difficult questions
  if (data.difficult) {
    data.difficult.forEach((question, index) => {
      // If correct answer is always 0, randomize it
      if (question.correct === 0 && question.options && question.options.length === 4) {
        // Randomly choose which position should be correct (0, 1, 2, or 3)
        const newCorrectIndex = Math.floor(Math.random() * 4);
        
        // Swap the correct answer to new position
        const correctAnswer = question.options[0];
        const swappedAnswer = question.options[newCorrectIndex];
        
        question.options[newCorrectIndex] = correctAnswer;
        question.options[0] = swappedAnswer;
        question.correct = newCorrectIndex;
        
        changedCount++;
      }
    });
  }
  
  // Write back to file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`   ✅ Changed ${changedCount} questions`);
});

console.log('\n🎉 All questions randomized!');
console.log('\n📊 Distribution check:');

// Check distribution
testFiles.forEach(fileName => {
  const filePath = path.join(__dirname, 'database', fileName);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  const distribution = { 0: 0, 1: 0, 2: 0, 3: 0 };
  
  if (data.easy) {
    data.easy.forEach(q => {
      if (q.correct !== undefined) distribution[q.correct]++;
    });
  }
  
  if (data.difficult) {
    data.difficult.forEach(q => {
      if (q.correct !== undefined) distribution[q.correct]++;
    });
  }
  
  console.log(`\n${fileName}:`);
  console.log(`   Option 1 (index 0): ${distribution[0]} questions`);
  console.log(`   Option 2 (index 1): ${distribution[1]} questions`);
  console.log(`   Option 3 (index 2): ${distribution[2]} questions`);
  console.log(`   Option 4 (index 3): ${distribution[3]} questions`);
});

console.log('\n✅ Done! Restart the bot to apply changes.');
