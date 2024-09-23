const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const shortid = require('shortid');
let bodyParser = require('body-parser')
let short = shortid.generate()
console.log(short)

// connect to mongodb////////////
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => {console.log("connected to mongodb")})
.catch(() => {console.log("failed to connect .... ERROR")})
/////////////////////////////////////

///schema designs for collections in database////

// Define the log subdocument schema
const logSchema = new mongoose.Schema({
  description: String,
  duration:  Number,
  date:  String
});
//////////////////////////////////////////////////////////////////////////////////

const users_Schema =  new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  log: [logSchema],// array of log sub documents
  _id: { type: String, required: true}
});

user_Database = mongoose.model('users', users_Schema);
////////////////////////////////////////////////////////////////

app.use(cors())
app.use(express.static('public'))

/////////////////////////////////
app.use(bodyParser.urlencoded({ extended: false }));
///////////////////////////////////////////////

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.route('/api/users')
.get((req, res) => {
   user_Database.find({}, { username: 1, _id: 1 }).then((data) => {
    if (data) {
      res.json(data)
    } else {
      res.json({error: "could not retrive"})
    }
   }).catch(error => {
    console.log("ERROR", error)
   })
})
.post((req, res) => {
  let name_input = req.body.username
  user_Database.findOne({username: name_input}).then((data) => {
    //if data found
    if (data) {
      res.json({_id: data._id, username: data.username})
    } else {
      let short_code = shortid.generate()
      const new_user = new user_Database({ username: name_input, _id: short_code,})
      new_user.save()
      // checking errors during saving command
          .then(() => {
          console.log("Record saved");
          // Send the new record details as the JSON response
          res.json({username: name_input, _id: short_code });
        })
        .catch(() => {
          console.log("Failed to save record");
          res.status(500).json({ error: 'Failed to save the new record' });
        });
       
    }
    }
  )
   .catch(error => {
    console.log("Error occurred ", error);
    res.status(500).json({ error: 'Database error' });
  });

})


app.post('/api/users/:_id/exercises', (req, res) => {
   user_Database.findOne({_id: req.params._id}).then(
    (data) => {
      if (data) {
        let date_input = req.body.date ? new Date(req.body.date).toDateString() : new Date().toDateString()
        data.log.push({description: req.body.description, duration: Number(req.body.duration), date : date_input})
        data.save().then((data) => {
          console.log("updated")
          res.json({
            _id: req.params._id,
            username: data.username,
            date: date_input,
            description: req.body.description,
            duration: Number(req.body.duration), 
          })
        }).catch(error => {
          console.log("error didnt save", error)
        })

      } else {
        res.json({error: "ERROR!, Invalid id"})
      }
    }
   ).catch(error => {
    console.log("error", error)
   })

})

app.get("/api/users/:_id/logs", (req, res)=> {

  //if there is query
  if (Object.keys(req.query).length > 0) {
    //extracting query arguement
    const {to, from, limit} = req.query;

    //getting the data needed
     user_Database.findOne({_id: req.params._id}).then(data => {
      //console.log(data)
      let data_log = data.log.map(a => {
          const { _id, ...rest } = a._doc; // Access the _doc and destructure _id
          return rest;
          })
      let data_analysis;
      let max_limit = Number(limit)
      let from_time = new Date(from)
      let json_result = {_id: req.params._id, username: data.username}
      let to_time;

      //checking if optional arguement (from) or (to) is given
      if ( from || to ) {
        /////from ///////////////////////////
        if (from) {
           data_analysis = data_log.filter(a => {
          let log_date = new Date(a.date).getTime()
          return log_date >= from_time.getTime()
          })
          json_result.from = from_time.toDateString()
        }
        ///////////////////////////////////////////////////////

        ///to/////////////////////////////
          if (to) {
                  let data_analysis_to = data_analysis ? data_analysis : data_log
                  to_time = new Date(to)
                  //////////////////////////////////////// filtering the details needed
                  data_analysis = data_analysis_to.filter(a => {
                    let log_date = new Date(a.date).getTime()
                    return  log_date <= to_time.getTime()
                  })
                  json_result.to = to_time.toDateString()
          }
        ///////////////////////////////////////
    } 
        if (limit) {
          /// putting a limit in the log search
          let data_analysis_limit = data_analysis ? data_analysis : data_log
          data_analysis = max_limit >= data_analysis_limit.length ? data_analysis_limit :
          max_limit == 0 ? data_analysis_limit :
          data_analysis_limit.slice(0, max_limit)
        }
        json_result.count = data_analysis.length
        json_result.log = data_analysis
        res.json(json_result);

    }).catch(err => {console.log("ERROR", err)})
   
  } else { // if query not found
     user_Database.findOne({_id: req.params._id}).then(

    (data) => {
      if (data) {
        //////////////////////////////////////////
        res.json({
  username: data.username,
  count: data.log.length,
  _id: req.params._id,
  log: data.log
        })
      } else {
         res.status(400).json({error: "invalid Id"})
      }
    }
  ).catch(err => {
    console.log("ERROR", err)
    res.status(500).json({ error: "Failed to retrieve user data" })

  })

  } 

})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
