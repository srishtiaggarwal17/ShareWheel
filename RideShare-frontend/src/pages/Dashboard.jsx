import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUserContext } from "../context/UserContext";
import {Card,CardContent,CardDescription,CardFooter,CardHeader,CardTitle,} from "../components/ui/card";
import { Button } from "../components/ui/button";
import {Tabs,TabsContent,TabsList,TabsTrigger,} from "../components/ui/tabs";
import {Calendar,Car,MapPin,Clock,User,Users,Check,X, Trash,CheckCircle, XCircle,} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { useToast } from "../hooks/use-toast";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Badge } from "../components/ui/badge";

const Dashboard = () => {
  const { user, loading: userLoading } = useUserContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [upcomingRides, setUpcomingRides] = useState([]);
  const [requests, setRequests] = useState([]);
  const [bookingRequests, setBookingRequests] = useState([]);
  const [otherRides, setOtherRides] = useState([]);
  const [offeredRides, setOfferedRides] = useState([]);
  const [stats, setStats] = useState({
    totalRides: 0,
    earnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rideToDelete, setRideToDelete] = useState(null);
  const [ongoingRides, setOngoingRides] = useState([]);

  // Add useEffect to fetch user rides when the "offered" tab is selected
  useEffect(() => {
    if (activeTab === "offered" && user) {
      fetchUserRides();
    }
  }, [activeTab, user]);

  useEffect(() => {
    // If user is not logged in, redirect to login
    if (!userLoading && !user) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if token exists
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Authentication token missing");
          setLoading(false);
          navigate("/login");
          return;
        }

        // Fetch user rides
        const userRidesResponse = await axios.get(
          `${API_BASE_URL}/rides/user/rides`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const bookingsResponse = await fetchBookingRequests();

        const rides = userRidesResponse.data || [];

        // Filter upcoming rides (where user is driver or passenger)
        const upcoming = rides.filter((ride) => {
          if (!ride || !ride.driver) return false;

          const driverId =
            ride.driver && ride.driver._id ? ride.driver._id : ride.driver;
          const isDriver = String(driverId) === String(user._id);
          const isPassenger =
            ride.passengers &&
            ride.passengers.some(
              (p) =>
                p &&
                p.user &&
                p.user._id === user._id &&
                (p.status === "confirmed" || p.status === "accepted")
            );

          return (isDriver || isPassenger) && ride.status === "scheduled";
        });

        // Filter rides offered by the user (only for drivers)
        const offered =rides.filter((ride) => {
                if (!ride || !ride.driver) return false;
                const driverId =
                  ride.driver && ride.driver._id
                    ? ride.driver._id
                    : ride.driver;
                return String(driverId) === String(user._id);
              });

        // Filter pending requests (where user is a pending passenger)
        const pendingRequests = rides.filter(
          (ride) =>
            ride &&
            ride.passengers &&
            ride.passengers.some(
              (passenger) =>
                passenger &&
                passenger.user &&
                passenger.user._id === user._id &&
                passenger.status === "pending"
            )
        );

        // Filter ongoing rides (where user is driver or confirmed passenger and status is 'started')
        const ongoing = rides.filter((ride) => {
          if (!ride || !ride.driver) return false;
          const driverId =
            ride.driver && ride.driver._id ? ride.driver._id : ride.driver;
          const isDriver = String(driverId) === String(user._id);
          const isPassenger =
            ride.passengers &&
            ride.passengers.some(
              (p) =>
                p &&
                p.user &&
                p.user._id === user._id &&
                p.status === "confirmed"
            );
          return (isDriver || isPassenger) && ride.status === "started";
        });

        setUpcomingRides(upcoming);
        setOfferedRides(offered);
        setRequests(pendingRequests);
        setOngoingRides(ongoing);

        // Fetch and set stats
        const statsResponse = await axios.get(
          `${API_BASE_URL}/users/${user._id}/stats`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setStats(statsResponse.data);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError(
          error.response?.data?.message || "Failed to fetch dashboard data"
        );
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, userLoading, navigate]);

  // Fetch booking requests for both driver and passenger
  const fetchBookingRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token missing");
      }

      // Fetch both driver and passenger bookings
      const [driverResponse, passengerResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/bookings/driver`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/bookings/passenger`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const driverBookings = driverResponse.data || [];
      const passengerBookings = passengerResponse.data || [];

      // Combine and sort by creation date
      const allBookings = [...driverBookings, ...passengerBookings].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      setBookingRequests(allBookings);
      return allBookings;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to fetch booking requests";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return [];
    }
  };

  const handleAcceptBooking = async (bookingId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token missing");
      }

      await axios.put(
        `${API_BASE_URL}/bookings/${bookingId}/status`,
        { status: "accepted" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Refresh booking requests
      await fetchBookingRequests();

      toast({
        title: "Success",
        description: "Booking request accepted successfully",
      });
    } catch (err) {
      console.error("Error accepting booking:", err);
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Error accepting booking request";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleRejectBooking = async (bookingId) => {
    try {
      await axios.put(
        `${API_BASE_URL}/bookings/${bookingId}/status`,
        { status: "rejected" },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Refresh booking requests
      fetchBookingRequests();

      toast({
        title: "Success",
        description: "Booking request rejected successfully",
      });
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Error rejecting booking request";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleAcceptRequest = async (rideId, passengerId) => {
    try {
      await axios.put(
        `${API_BASE_URL}/rides/${rideId}/passengers/${passengerId}/status`,
        { status: "confirmed" },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Update local state
      setRequests(requests.filter((req) => req._id !== rideId));
      setUpcomingRides([
        ...upcomingRides,
        requests.find((req) => req._id === rideId),
      ]);

      toast({
        title: "Success",
        description: "Request accepted successfully",
      });
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Error accepting request";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleRejectRequest = async (rideId, passengerId) => {
    try {
      await axios.put(
        `${API_BASE_URL}/rides/${rideId}/passengers/${passengerId}/status`,
        { status: "rejected" },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Update local state
      setRequests(requests.filter((req) => req._id !== rideId));

      toast({
        title: "Success",
        description: "Request rejected successfully",
      });
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Error rejecting request";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const fetchOtherRides = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token missing");
      }

      // Show loading toast
      toast({
        title: "Refreshing rides",
        description: "Fetching the latest available rides...",
      });

      const today = new Date().toISOString().split("T")[0];
      const response = await axios.get(`${API_BASE_URL}/rides`, {
        params: {
          date: today,
          seats: 1,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const allRides = response.data || [];

      // Filter rides not offered by the current user
      const others = allRides.filter((ride) => {
        if (!ride || !ride.driver) return false;

        return (
          ride.driver._id !== user._id &&
          new Date(ride.departureTime) > new Date() &&
          (ride.status === "scheduled" || !ride.status) &&
          ride.availableSeats > 0
        );
      });

      setOtherRides(others);

      toast({
        title: "Rides refreshed",
        description: `Found ${others.length} available rides.`,
      });
    } catch (error) {
      console.error("Error fetching other rides:", error);
      toast({
        title: "Error",
        description: "Failed to refresh available rides. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRide = async (rideId) => {
    setRideToDelete(rideId);
    setDeleteDialogOpen(true);
  };

  // Add a new function to fetch user rides
  const fetchUserRides = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token missing");
        setLoading(false);
        return;
      }

      // Fetch user rides
      const userRidesResponse = await axios.get(
        `${API_BASE_URL}/rides/user/rides`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("User rides response:", userRidesResponse.data);

      const rides = userRidesResponse.data || [];

      // Filter offered rides (where user is driver)
      const offered = rides.filter((ride) => {
        if (!ride || !ride.driver) return false;
        const driverId =
          ride.driver && ride.driver._id ? ride.driver._id : ride.driver;
        return String(driverId) === String(user._id);
      });

      // Sort rides by departure time (newest first)
      const sortedOfferedRides = offered.sort(
        (a, b) => new Date(b.departureTime) - new Date(a.departureTime)
      );

      setOfferedRides(sortedOfferedRides);

      // Fetch and set stats
      const statsResponse = await axios.get(
        `${API_BASE_URL}/users/${user._id}/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setStats(statsResponse.data);

      setLoading(false);
    } catch (err) {
      console.error("Error fetching user rides:", err);
      setError("Failed to fetch your rides");
      setLoading(false);
    }
  };

  const confirmDeleteRide = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token missing");
      }

      console.log(`Attempting to delete ride with ID: ${rideToDelete}`);
      console.log(`API URL: ${API_BASE_URL}/rides/${rideToDelete}`);

      // Attempt to delete the ride directly, backend will handle validation
      const response = await axios.delete(
        `${API_BASE_URL}/rides/${rideToDelete}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Refresh the rides list
      await fetchUserRides();

      toast({
        title: "Success",
        description: "Ride deleted successfully",
      });

      setDeleteDialogOpen(false);
      setRideToDelete(null);
    } catch (error) {
      console.error("Error deleting ride:", error);

      let errorMessage = "Failed to delete ride";

      if (error.response) {
        console.error("Error response:", error.response.data);
        errorMessage =
          error.response.data.message || "Server returned an error";
      } else if (error.request) {
        console.error("No response received:", error.request);
        errorMessage = "No response from server";
      } else {
        errorMessage = error.message || "An unknown error occurred";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      setDeleteDialogOpen(false);
      setRideToDelete(null);
    }
  };

  // Handle cancellation of a ride by a passenger
  const handleCancelRide = async (rideId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token missing");
      }

      // Find the passenger entry for this user in the ride
      const ride = upcomingRides.find((r) => r._id === rideId);
      if (!ride || !ride.passengers) {
        throw new Error("Ride or passenger information not found");
      }

      const passenger = ride.passengers.find(
        (p) =>
          p && p.user && p.user._id === user._id && p.status === "confirmed"
      );

      if (!passenger) {
        throw new Error("Passenger information not found");
      }

      // Call the API to cancel the ride for this passenger
      await axios.put(
        `${API_BASE_URL}/rides/${rideId}/passengers/${passenger._id}/status`,
        { status: "cancelled" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Refresh the dashboard
      window.location.reload();

      toast({
        title: "Success",
        description: "Ride cancelled successfully",
      });
    } catch (error) {
      console.error("Error cancelling ride:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel ride.",
        variant: "destructive",
      });
    }
  };

  const handleStartRide = async (rideId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token missing");
      }

      await axios.put(
        `${API_BASE_URL}/rides/${rideId}/status`,
        { status: "started" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Refresh the dashboard
      window.location.reload();

      toast({
        title: "Success",
        description: "Ride started successfully",
      });
    } catch (error) {
      console.error("Error starting ride:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start ride.",
        variant: "destructive",
      });
    }
  };

  // Handler for ending a ride
  const handleEndRide = async (rideId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token missing");
      }

      await axios.put(
        `${API_BASE_URL}/rides/${rideId}/status`,
        { status: "completed" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Refresh the dashboard
      window.location.reload();

      toast({
        title: "Success",
        description: "Ride completed successfully",
      });
    } catch (error) {
      console.error("Error completing ride:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete ride.",
        variant: "destructive",
      });
    }
  };

  // Utility function to check for valid MongoDB ObjectId
  // function isValidObjectId(id) {
  //   return (
  //     typeof id === "string" && id.length === 24 && /^[a-fA-F0-9]+$/.test(id)
  //   );
  // }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-red-500">{error}</div>
        </div>
      </MainLayout>
    );
  }

  const renderRideCard = (ride, tab = activeTab) => {
    const driverId =
      ride.driver && ride.driver._id ? ride.driver._id : ride.driver;

    return (
      <Card key={ride._id} className="mb-4 hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-grow space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div className="text-lg font-semibold flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-primary" />
                  {ride.from?.city || ride.from} → {ride.to?.city || ride.to}
                </div>
                <div className="flex items-center text-lg font-bold text-primary">
                  <span className="h-4 w-4 mr-1 text-muted-foreground text-lg">
                    ₹
                  </span>
                  {ride.pricePerSeat}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  {format(new Date(ride.departureTime), "PP")}
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                  {format(new Date(ride.departureTime), "p")}
                </div>
                <div className="flex items-center text-sm">
                  <Users className="h-4 w-4 mr-2 text-gray-500" />
                  {ride.availableSeats} seats
                </div>
                <div className="flex items-center text-sm">
                  <Car className="h-4 w-4 mr-2 text-gray-500" />
                  {ride.vehicle?.model} ({ride.vehicle?.color})
                </div>
                <div className="flex items-center text-sm">
                  <User className="h-4 w-4 mr-2 text-gray-500" />
                  {ride.driver?.name}
                </div>
                {ride.status && (
                  <div className="flex items-center text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        ride.status === "scheduled"
                          ? "bg-blue-100 text-blue-800"
                          : ride.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : ride.status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {ride.status.charAt(0).toUpperCase() +
                        ride.status.slice(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-row md:flex-col gap-2 items-center md:min-w-32">
              {/* Action buttons for each ride */}
              <>
                {activeTab === "others" && (
                  <Button
                    onClick={() => navigate(`/ride/${ride._id}`)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Book Seat
                  </Button>
                )}
                {activeTab === "offered" && (
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteRide(ride._id)}
                    className="w-full"
                  >
                    <Trash className="h-4 w-4 mr-2" /> Delete Ride
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => navigate(`/ride/${ride._id}`)}
                  className="w-full"
                >
                  View Details
                </Button>
                {/* Start Ride button for driver in Upcoming Rides */}
                {activeTab === "upcoming" &&
                  user &&
                  String(driverId) === String(user._id) &&
                  ride.status === "scheduled" &&
                  new Date(ride.departureTime) <= new Date() && (
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => handleStartRide(ride._id)}
                    >
                      Start Ride
                    </Button>
                  )}
                {/* Pay Now and Cancel Ride buttons for confirmed passengers in Upcoming Rides */}
                {activeTab === "upcoming" &&
                  user &&
                  ride.passengers &&
                  (() => {
                    const passenger = ride.passengers.find(
                      (p) =>
                        p &&
                        p.user &&
                        p.user._id === user._id &&
                        p.status === "confirmed"
                    );
                    if (
                      passenger &&
                      passenger.paymentStatus === "pending" &&
                      ride.status === "scheduled"
                    ) {
                      return (
                        <>
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => navigate(`/payment/${ride._id}`)}
                          >
                            Pay Now
                          </Button>
                          <Button
                            className="w-full bg-red-600 hover:bg-red-700 text-white mt-2"
                            onClick={() => handleCancelRide(ride._id)}
                          >
                            Cancel Ride
                          </Button>
                        </>
                      );
                    }
                    // Show Payment Completed if payment is done and ride is still scheduled
                    if (
                      passenger &&
                      passenger.paymentStatus === "completed" &&
                      ride.status === "scheduled"
                    ) {
                      return (
                        <Button
                          variant="outline"
                          className="w-full bg-green-100 text-green-800 hover:bg-green-200"
                          disabled
                        >
                          Payment Completed
                        </Button>
                      );
                    }
                    return null;
                  })()}
                {/* End Ride button for driver in Ongoing Rides */}
                {tab === "ongoing" &&
                  user &&
                  String(driverId) === String(user._id) &&
                  ride.status === "started" && (
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => handleEndRide(ride._id)}
                    >
                      End Ride
                    </Button>
                  )}
                {/* Ride Completed notification for driver and confirmed passengers */}
                {ride.status === "completed" && (
                  <Button
                    variant="outline"
                    className="w-full bg-green-100 text-green-800 hover:bg-green-200"
                    disabled
                  >
                    Ride Completed
                  </Button>
                )}
                {/* Show only a single green Payment Completed box for driver if any confirmed passenger has completed payment */}
                {activeTab === "upcoming" &&
                  user &&
                  String(driverId) === String(user._id) &&
                  ride.passengers &&
                  ride.passengers.some(
                    (p) =>
                      p &&
                      p.status === "confirmed" &&
                      p.paymentStatus === "completed"
                  ) && (
                    <div className="w-full mt-2">
                      <span className="px-2 py-1 rounded bg-green-100 text-green-800 block text-center font-semibold">
                        Payment Completed
                      </span>
                    </div>
                  )}
              </>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          {/* <Button asChild>
            <Link to="/offer-ride">Offer a Ride</Link>
          </Button> */}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div
            onClick={() => navigate("/find-rides")}
            className="relative rounded-2xl overflow-hidden cursor-pointer group shadow-md hover:shadow-xl transition-all duration-300">
            <img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70"
            className="w-full h-56 object-cover group-hover:scale-105 transition duration-300"
            />
            <div className="absolute inset-0 bg-black/60 flex flex-col justify-center p-6">
              <h2 className="text-white text-2xl font-bold">Find a Ride</h2>
              <p className="text-gray-300 text-sm mt-1">
              Discover rides going your way
              </p>
              <button className="mt-4 bg-primary text-white px-4 py-2 rounded-lg w-fit hover:bg-primary/90 transition">
              Search Rides
              </button>
            </div>
          </div>
          <div
            onClick={() => navigate("/offer-ride")}
            className="relative rounded-2xl overflow-hidden cursor-pointer group shadow-md hover:shadow-xl transition-all duration-300">
            <img
              src="https://images.unsplash.com/photo-1493238792000-8113da705763"
              className="w-full h-56 object-cover group-hover:scale-105 transition duration-300"
            />
            <div className="absolute inset-0 bg-black/60 flex flex-col justify-center p-6">
              <h2 className="text-white text-2xl font-bold">Offer a Ride</h2>
              <p className="text-gray-300 text-sm mt-1">
                Share your ride and earn
              </p>
              <button className="mt-4 border border-white text-white px-4 py-2 rounded-lg w-fit hover:bg-white hover:text-black transition">
                Post Ride
              </button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="mb-4">
            <TabsTrigger value="upcoming">Upcoming Rides</TabsTrigger>
            <TabsTrigger value="ongoing">Ongoing Rides</TabsTrigger>
            <TabsTrigger value="requests">
              Ride Requests{" "}
              {bookingRequests.length > 0 && `(${bookingRequests.length})`}
            </TabsTrigger>
            <TabsTrigger value="offered">My Offered Rides</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            <h2 className="text-2xl font-bold mb-4">Upcoming Rides</h2>
            {upcomingRides.length > 0 ? (
              upcomingRides.map((ride) => renderRideCard(ride))
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No upcoming rides.</p>
                  <p className="text-muted-foreground mt-1">
                    <Link
                      to="/find-rides"
                      className="text-primary hover:underline"
                    >
                      Find a ride
                    </Link>{" "}
                    or{" "}
                    <Link
                      to="/offer-ride"
                      className="text-primary hover:underline"
                    >
                      offer a ride
                    </Link>
                    .
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="ongoing">
            <h2 className="text-2xl font-bold mb-4">Ongoing Rides</h2>
            {ongoingRides.length > 0 ? (
              ongoingRides.map((ride) => renderRideCard(ride, "ongoing"))
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No ongoing rides.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="requests">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Ride Requests</h2>
              <Button
                onClick={fetchBookingRequests}
                variant="outline"
                size="sm"
              >
                Refresh Requests
              </Button>
            </div>

            {bookingRequests.length > 0 ? (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3">Booking Requests</h3>
                {bookingRequests.map((booking) => {
                  if (!booking || !booking.driver || !booking.passenger) {
                    return null;
                  }

                  return (
                    <Card key={booking._id || Math.random()} className="mb-4">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="space-y-4 w-full">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col gap-2 w-full">
                                <div className="flex items-center gap-2">
                                  <Car className="h-4 w-4 text-gray-500" />
                                  <span className="font-medium">
                                    Driver:{" "}
                                    {booking.driver?.name || "Unknown Driver"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-500" />
                                  <span className="font-medium">
                                    Passenger:{" "}
                                    {booking.passenger?.name ||
                                      "Unknown Passenger"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      booking.status === "pending"
                                        ? "outline"
                                        : booking.status === "accepted"
                                        ? "success"
                                        : booking.status === "rejected"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                  >
                                    {booking.status.charAt(0).toUpperCase() +
                                      booking.status.slice(1)}
                                  </Badge>
                                  <Badge
                                    variant={
                                      booking.driver?._id === user?._id
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {booking.driver?._id === user?._id
                                      ? "You are the driver"
                                      : "You are the passenger"}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-500" />
                                <span>
                                  {booking.ride &&
                                    new Date(
                                      booking.ride.departureTime
                                    ).toLocaleString()}
                                </span>
                              </div>
                              <Badge
                                variant={
                                  booking.status === "pending"
                                    ? "outline"
                                    : booking.status === "accepted"
                                    ? "success"
                                    : booking.status === "rejected"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {booking.status.charAt(0).toUpperCase() +
                                  booking.status.slice(1)}
                              </Badge>
                            </div>

                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                              <span>
                                {booking.pickupLocation} →{" "}
                                {booking.dropoffLocation}
                              </span>
                            </div>

                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-2 text-gray-500" />
                              <span>
                                {booking.seats}{" "}
                                {booking.seats === 1 ? "seat" : "seats"}{" "}
                                requested
                              </span>
                            </div>

                            {booking.specialRequests &&
                              booking.specialRequests !== "none" && (
                                <div className="text-sm text-gray-600">
                                  <span className="font-medium">
                                    Special requests:{" "}
                                  </span>
                                  {booking.specialRequests}
                                </div>
                              )}

                            <div className="flex items-center">
                              <span className="h-4 w-4 mr-1 text-muted-foreground text-lg">
                                ₹
                              </span>
                              <span className="font-semibold">
                                ₹{booking.price.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {booking.status === "pending" &&
                            booking.driver._id === user._id && (
                              <div className="flex gap-2 mt-4 md:mt-0">
                                <Button
                                  variant="outline"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() =>
                                    handleAcceptBooking(booking._id)
                                  }
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Accept
                                </Button>
                                <Button
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() =>
                                    handleRejectBooking(booking._id)
                                  }
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </Button>
                              </div>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  No booking requests at the moment.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="offered">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">My Offered Rides</h2>
              <Button onClick={fetchUserRides} variant="outline" size="sm">
                Refresh Rides
              </Button>
            </div>
            {offeredRides.length > 0 ? (
              offeredRides.map((ride) => renderRideCard(ride))
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">
                    You haven't offered any rides yet.
                  </p>
                  <p className="text-muted-foreground mt-1">
                    <Link
                      to="/offer-ride"
                      className="text-primary hover:underline"
                    >
                      Offer a ride
                    </Link>{" "}
                    now.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              ride and any pending booking requests associated with it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRide}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Dashboard;
