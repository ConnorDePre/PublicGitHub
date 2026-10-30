import {
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Route,
} from 'react-router-dom'
import Library from "./pages/Library";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Settings from "./pages/Settings";
import ShapeTools from "./pages/ShapeTools";
import BookEditor from "./pages/BookEditor";
import ReadBook from "./pages/ReadBook";
import Publish from "./pages/Publish";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import EditProfile from "./pages/EditProfile";

import PersonalMock from "./pages/PersonalMock";
import Search from "./pages/Search";

import Layout from "./layouts/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

import "./App.css";


const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<Landing />} />
      <Route path="/Register" element={<Register />} />
      <Route path="/Login" element={<Login />} />
      <Route path="/Book-Editor" element={<BookEditor />} />
      <Route path="/Publish" element={<Publish />} />
      <Route path="/read-book/:bookId/:title" element={<ReadBook />} />
      <Route path="/shape-tools" element={<ShapeTools />} />

      {/* Pages WITH navbar */}
      <Route element={<Layout />}>
        <Route path="/Home" element={<Home />} />
        <Route path="/library" element={<Library />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:username" element={<UserProfile />} />
        <Route path="/search" element={<Search />} />
        <Route
          path="/profile/:username/edit"
          element={
            <ProtectedRoute>
              <EditProfile />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route element={<Layout />}>
        <Route
          path="/personalMock"
          element={
            <ProtectedRoute>
              <PersonalMock />
            </ProtectedRoute>
          }
        />
      </Route>
    </>
  )
);

function App() {
  return <RouterProvider router={router} />;
}

export default App
