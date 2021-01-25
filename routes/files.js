const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const File = require('../models/file');

const { v4: uuid4 } =require('uuid');
const { route } = require('./show');

let storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/' ),
    filename: (req, file, cb) => {

        const uniqueName = `${Date.now()}-${Math.round(Math.round() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
})


let upload = multer({
    storage,
    limit: { fileSize:1000000 * 100},
}).single('myfile');



router.post('/', (req,res) => {

    //store files
    if (req.file) {
        return res.json({ error: 'All fields required.' });
    }

    upload(req, res, async (err) => {
        //validate request
      

        if(err){
            return res.status(500).send({ error: err.message})
        }

            // Store in DB
            const file = new File({
                filename: req.file.filename,
                uuid: uuid4(), 
                path: req.file.path,
                size: req.file.size
            });

            const response = await file.save();
            return res.json({ file: `${process.env.APP_BASE_URL}/files/${response.uuid}`});

            //htttp://localhost:3000/files/23kj234234nk23n4knk
    });
    //Response -> link
});


router.post('/send', async (req, res) => {
    //Validate Request
/*
    console.log(req.body);
    return res.send({});
  
  */
   const { uuid, emailTo, emailFrom} = req.body;

    if(!uuid || !emailTo || !emailFrom) {
        return res.status(422).send({ error: 'All fields r required.'});
    }
    
    //Get from DB
    const file = await File.findOne({ uuid: uuid});
    if(file.send){
        return res.status(422).send({ error: 'Email Already Sent.'});
    }
    file.sender = emailFrom;
    file.receiver = emailTo;
    const response = await file.save();


    //send email
    const sendMail =require('../services/emailService');
    sendMail({
        from: emailFrom,
        to: emailTo,
        subject: 'storeNshare file sharing',
        text: `${emailFrom} shared a file with you.`,
        html: require('../services/emailTemplate')({
            emailFrom: emailFrom,
            downloadLink: `${process.env.APP_BASE_URL}/files/${file.uuid}`,
            size: parseInt(file.size/1000) + ' KB',
            expires: '24 hours'
        })
    });
        return res.send({ success: true});


});

module.exports = router;