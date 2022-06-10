import express from "express";
import cors from "cors";
import mongoose from "mongoose";

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/project-mongo";
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = Promise;

//Task model
const taskModel = new mongoose.Schema({
  userId: Object, //the userid from login here/create user, use query to find in endpoint
  tasks: [
    {name: String, date: Number, done: Boolean}
  ],
});

const Task = mongoose.model('Task', taskModel);

//User model
//add crypto later for authentication signin token
const userModel = new mongoose.Schema({
  name: {
    type: String,
    unique: true
  },
  email: {
    type: String,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  // accessToken: {
  //   type: String,
  //   default: () => crypto.randomBytes(128).toString('hex')
  // }
});

const User = mongoose.model('User', userModel);

// Defines the port the app will run on. Defaults to 8080, but can be overridden
// when starting the server. Example command to overwrite PORT env variable value:
// PORT=9000 npm start
const port = process.env.PORT || 8080;
const app = express();

app.use(cors());
app.use(express.json());

// Start defining your routes here
app.get("/", (req, res) => {
  res.send("Server response ok");
});

app.post("/createtask", async (req, res) => {
  const { name, date, done } = req.body;

  //do a "if user, create task with userId same as user login userId"
  //after first task is created (check validate with find() to see if exists), only do update task model to save in same collection
  //what happens if findoneanddelete() on id with tasks until 0 tasks, will collection still remain? (i.e. === true)

  console.log(typeof app.locals.userId)
  try {
    const newTask = await new Task({userId: app.locals.userId, tasks: [{name, date, done}]});
    newTask.save();
    console.log(newTask.userId);
    res.status(201).json({task: newTask.userId });
  } catch(err) {
    res.status(400).json({message: 'Could not create task', errors: err.message})
  }
});

//middleware
// const identifyUserId = (req, res) => {
//   app.locals.userId = req.body.userId;
//   next();
// }

//Adds new task object to existing array of tasks in a collection with specific id
app.post("/addtask", async (req, res) => {
  const { name, date, done } = req.body;

  try {
    //this adds tasks to the first matching userid it finds, thus have to validate that once first task is created, only let
    //user send post request to this endpoint for updating list of tasks instead of creating a new document
  const addTask = await Task.findOneAndUpdate(
    { userId: app.locals.userId },
    { $push: {tasks: [{ name, date, done}]} }
  ).exec();
  //the returned new collection will not immediately display in res.json but will in mongodb database collection
  res.status(201).json({ addTask });
  } catch(err) {
    res.status(400).json({message: 'Could not add another task', errors: err.message})
  }
}); 

app.get("/gettask", async (req, res) => {
  console.log(app.locals.userId);
  //when the server refreshes, its a new lifecycle, and app.locals is reset. So if we run this endpoint first, it doesnt have anything to 
  //point to app.local.userId, since that value is created through /signup or /signin endpoint, thus we have to run that one first.
  //Unless we force the user to login first thing they do in the website before creating any task, since we could fetch that userId and 
  //save it to app.locals.userId to user in subsequent endpoint interactions
  const selectTask = await Task.findOne({ userId: 555 }).exec();
  res.status(201).json({ selectTask });
});

app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
//handle if duplicates on frontend, print message that says cannot create user due to duplicate, instead of printing user json
  try {
  const user = await new User({ name, email, password });
  user.save();
  console.log(user._id);
  app.locals.userId = user._id;
  res.status(201).json({ user });
  } catch(err) {
    res.status(400).json({message: 'Could not add  user', errors: err.message})
  }
});

app.post('/signin', async (req, res) => {
  const user = await User.findOne({email: req.body.email});

  app.locals.userId = user._id;
  res.status(201).json({ user, userId: user._id });
  // if (user && bcrypt.compareSync(req.body.password, user.password)) {
  //   res.cookie('accessToken', user.accessToken, { httpOnly: true });
  //   res.status(201).json({id: user._id, accessToken: user.accessToken});
  //   console.log(res.getHeaders())
  // } else {
  //   res.json({notFound: true});
  // } 
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
