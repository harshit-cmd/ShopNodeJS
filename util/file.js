const fs = require('fs');

exports.deleteFile = (filePath) => {
  console.log('hiiiii');
  fs.unlink(filePath, (err) => {
    if (err)
      throw err;
  });
};


