import { createBrowserRouter } from "react-router";
import RootLayout from "./RootLayout";
import Login from "./pages/auth/Login";
import SignUp from "./pages/auth/SignUp";
import DriverRegistration from "./pages/auth/DriverRegistration";
import UserHomepage from "./pages/user/UserHomepage";
import BookingPage from "./pages/user/BookingPage";
import ReservationPage from "./pages/user/ReservationPage";
import VehicleSelectionPage from "./pages/user/VehicleSelectionPage";
import PreferencePage from "./pages/user/PreferencePage";
import PaymentMethodPage from "./pages/user/PaymentMethodPage";
import DriverRequestPage from "./pages/user/DriverRequestPage";
import RidePage from "./pages/user/RidePage";
import UserMessageCallPage from "./pages/user/UserMessageCallPage";
import UserBillPage from "./pages/user/UserBillPage";
import DriverRatingPage from "./pages/user/DriverRatingPage";
import UserRideHistoryPage from "./pages/user/UserRideHistoryPage";
import UserProfilePage from "./pages/user/UserProfilePage";
import UserEditProfilePage from "./pages/user/UserEditProfilePage";
import DriverHomepage from "./pages/driver/DriverHomepage";
import DriverRideAcceptPage from "./pages/driver/DriverRideAcceptPage";
import DriverReservationAcceptPage from "./pages/driver/DriverReservationAcceptPage";
import DriverRideInfoPage from "./pages/driver/DriverRideInfoPage";
import DriverMessageCallPage from "./pages/driver/DriverMessageCallPage";
import DriverBillPage from "./pages/driver/DriverBillPage";
import DriverRideHistoryPage from "./pages/driver/DriverRideHistoryPage";
import IncomeManagementPage from "./pages/driver/IncomeManagementPage";
import DriverProfilePage from "./pages/driver/DriverProfilePage";
import DriverEditProfilePage from "./pages/driver/DriverEditProfilePage";
import NotFound from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      {
        path: "/",
        Component: Login,
      },
      {
        path: "/login",
        Component: Login,
      },
      {
        path: "/signup",
        Component: SignUp,
      },
      {
        path: "/driver-registration",
        Component: DriverRegistration,
      },
      {
        path: "/user/home",
        Component: UserHomepage,
      },
      {
        path: "/user/booking",
        Component: BookingPage,
      },
      {
        path: "/user/reservation",
        Component: ReservationPage,
      },
      {
        path: "/user/vehicle-selection",
        Component: VehicleSelectionPage,
      },
      {
        path: "/user/preference",
        Component: PreferencePage,
      },
      {
        path: "/user/payment-method",
        Component: PaymentMethodPage,
      },
      {
        path: "/user/driver-request",
        Component: DriverRequestPage,
      },
      {
        path: "/user/ride",
        Component: RidePage,
      },
      {
        path: "/user/message-call",
        Component: UserMessageCallPage,
      },
      {
        path: "/user/bill",
        Component: UserBillPage,
      },
      {
        path: "/user/rating",
        Component: DriverRatingPage,
      },
      {
        path: "/user/history",
        Component: UserRideHistoryPage,
      },
      {
        path: "/user/profile",
        Component: UserProfilePage,
      },
      {
        path: "/user/edit-profile",
        Component: UserEditProfilePage,
      },
      {
        path: "/driver/home",
        Component: DriverHomepage,
      },
      {
        path: "/driver/ride-accept",
        Component: DriverRideAcceptPage,
      },
      {
        path: "/driver/reservation-accept",
        Component: DriverReservationAcceptPage,
      },
      {
        path: "/driver/ride-info",
        Component: DriverRideInfoPage,
      },
      {
        path: "/driver/message-call",
        Component: DriverMessageCallPage,
      },
      {
        path: "/driver/bill",
        Component: DriverBillPage,
      },
      {
        path: "/driver/history",
        Component: DriverRideHistoryPage,
      },
      {
        path: "/driver/income",
        Component: IncomeManagementPage,
      },
      {
        path: "/driver/profile",
        Component: DriverProfilePage,
      },
      {
        path: "/driver/edit-profile",
        Component: DriverEditProfilePage,
      },
      {
        path: "*",
        Component: NotFound,
      },
    ],
  },
]);