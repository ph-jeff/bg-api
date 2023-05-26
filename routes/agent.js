const express = require('express');
const bcrypt = require('bcrypt');
const Agent = require('../models/agent');
const Admin = require('../models/admin');
const router = express.Router();    
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const SECRET = process.env.JWTPRIVATEKEY;

function createReferralCode() {
    return crypto.randomBytes(4).toString('hex');
}
router.post('/create', async (req, res) => {
    try {

        const token = req.body.adminToken;
        const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
        const creatorAdmin = await Admin.findById(decoded.id);
        if(!creatorAdmin){
            res.status(403).json({ message: 'Youre not an admin' });
            return;
        }
        let referralCode = createReferralCode();
        let existingAdmin = await Agent.findOne({ referralCode });
        console.log(referralCode, existingAdmin)
        while (existingAdmin) {
          referralCode = createReferralCode();
          existingAdmin = await Agent.findOne({ referralCode });
        }
        console.log(referralCode)
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        let profile = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            phoneNumber: req.body.phoneNumber,
            username: req.body.username,
            password: hashedPassword,
            referralCode: referralCode
        }
        console.log(profile)
        const admin = new Agent(profile);
        await admin.save();
        res.status(201).json({ message: 'Agent created successfully' });
    } catch (err) {
        console.log(err)
        res.status(400).json({ error: err.message });
    }
});

router.post("/profile", async(req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1]; // get the JWT from the headers
        const decoded = jwt.verify(token, SECRET); // verify the JWT and decode it
        const agent = await Agent.findOne({ _id: decoded.id });
        res.status(200).json({ profile: agent});

    } catch (error) {
        console.log(error)
        res.status(400).json({ message: error.message });
    }
})



router.post('/login', async (req, res) => {
    try {
        const agent = await Agent.findOne({ $or: [{ email: req.body.username }, { username: req.body.username }]  });
        console.log(agent);
        if (!agent) return res.status(401).send({ message: "Agent not found" });

        const validPassword = await bcrypt.compare(
			req.body.password,
			agent.password
		);

        console.log(validPassword)
       
        if (!validPassword) return res.status(401).send({ error: 'Wrong password.' });

        const token = jwt.sign({ id: agent._id }, process.env.JWTPRIVATEKEY, { expiresIn: 86400 });
        res.status(200).send({ auth: true, token });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ error: 'Error on the server.' });
    }
});


router.get("/", async (req, res) => {
    try {
        let agents = await Agent.find().select("-password");
		res.status(200).send({ data: agents });
	} catch (error) {
		console.log(error);
		res.status(500).send({ message: "Internal Server Error" });
	}
});

router.put("/profile/edit", async(req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1]; // get the JWT from the headers
        const decoded = jwt.verify(token, SECRET); // verify the JWT and decode it
        let profile = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            phoneNumber: req.body.phoneNumber,
            username: req.body.username,
        }
        const updatedAgent = await Agent.findOneAndUpdate({ _id: decoded.id }, profile, { new: true });
        res.status(200).json({ profile: updatedAgent});

    } catch (error) {
        console.log(error)
        res.status(400).json({ message: error.message });
    }
})


router.put("/change-password", async (req, res) => {
    try {
      const token = req.headers.authorization.split(" ")[1]; // get the JWT from the headers
      const decoded = jwt.verify(token, SECRET); // verify the JWT and decode it
      const agent = await Agent.findById(decoded.id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      const validPassword = await bcrypt.compare(
        req.body.currentPassword,
        agent.password
      );
      if (!validPassword) {
        return res.status(401).json({ message: "Wrong password" });
      }
      const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
      agent.password = hashedPassword;
      await agent.save();
      res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
      console.log(error);
      res.status(400).json({ message: error.message });
    }
  });
  


module.exports = router;