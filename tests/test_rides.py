import requests
import threading
import unittest
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3001/api"

def future_time(hours=24):
    """Returns a future local datetime string"""
    return (datetime.now() + timedelta(hours=hours)).strftime('%Y-%m-%dT%H:%M')

def future_time_utc(hours=24):
    """Returns a future UTC datetime string — used for date filter tests"""
    return (datetime.utcnow() + timedelta(hours=hours)).strftime('%Y-%m-%dT%H:%M:%S') + 'Z'

def past_time(hours=1):
    """Returns a past local datetime string"""
    return (datetime.now() - timedelta(hours=hours)).strftime('%Y-%m-%dT%H:%M')

def create_test_ride(overrides=None):
    """
    Helper to create a standard test ride with optional overrides.
    Raises an exception if creation fails so tests fail clearly.
    NOTE: uses overrides=None (not {}) to avoid Python mutable default argument bug.
    """
    if overrides is None:
        overrides = {}
    defaults = {
        "title": "Test Ride",
        "description": "Test description",
        "pickup_location": "UCLA",
        "destination": "LAX",
        "total_seats": 4,
        "creator_user_id": 9999,
        "departure_time": future_time(24),
        "is_round_trip": False
    }
    defaults.update(overrides)
    res = requests.post(f"{BASE_URL}/rides", json=defaults)
    ride = res.json().get("ride")
    if not ride:
        raise Exception(f"Failed to create test ride: {res.status_code} {res.json()}")
    return ride

def delete_ride(ride_id, user_id=9999):
    """
    Helper to clean up a test ride after a test.
    Warns if deletion fails so test pollution is visible.
    """
    res = requests.delete(f"{BASE_URL}/rides/{ride_id}", json={"userId": user_id})
    if res.status_code not in [200, 404]:
        print(f"\nWarning: failed to delete test ride {ride_id}: {res.json()}")


class TestRidesAPI(unittest.TestCase):

    # ─── GET /api/rides ───────────────────────────────────────────────────────

    def test_01_get_rides_returns_list(self):
        """GET /api/rides should return a list"""
        res = requests.get(f"{BASE_URL}/rides")
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_02_get_rides_have_required_fields(self):
        """Each ride should have all required fields"""
        # Create a fresh ride to ensure at least one ride exists with all new fields
        ride = create_test_ride()
        try:
            res = requests.get(f"{BASE_URL}/rides")
            rides = res.json()
            self.assertGreater(len(rides), 0, "No rides in DB to test")
            for r in rides:
                # Skip old rides created before schema migrations
                if r.get("departure_time") is None:
                    continue
                for field in ["id", "pickup_location", "destination", "total_seats",
                             "available_seats", "passengers", "creator_user_id",
                             "departure_time", "is_round_trip", "removed_passengers"]:
                    self.assertIn(field, r, f"Missing field: {field}")
        finally:
            delete_ride(ride["id"])

    def test_03_available_seats_never_negative(self):
        """No ride should have negative available seats"""
        res = requests.get(f"{BASE_URL}/rides")
        for ride in res.json():
            self.assertGreaterEqual(ride["available_seats"], 0,
                f"Ride {ride['id']} has negative seats")

    def test_04_available_seats_not_exceed_total(self):
        """available_seats should never exceed total_seats"""
        res = requests.get(f"{BASE_URL}/rides")
        for ride in res.json():
            self.assertLessEqual(ride["available_seats"], ride["total_seats"],
                f"Ride {ride['id']} has more available than total seats")

    # ─── POST /api/rides (create) ─────────────────────────────────────────────

    def test_05_create_ride_success(self):
        """Should be able to create a valid ride"""
        res = requests.post(f"{BASE_URL}/rides", json={
            "title": "Test Ride",
            "description": "Test description",
            "pickup_location": "UCLA",
            "destination": "LAX",
            "total_seats": 4,
            "creator_user_id": 9999,
            "departure_time": future_time(24),
            "is_round_trip": False
        })
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.json().get("success"))
        ride = res.json().get("ride")
        self.assertEqual(ride["available_seats"], 3)
        self.assertEqual(ride["passengers"], [])
        self.assertEqual(ride["removed_passengers"], [])
        delete_ride(ride["id"])

    def test_06_create_ride_missing_fields(self):
        """Should fail if required fields are missing"""
        res = requests.post(f"{BASE_URL}/rides", json={
            "title": "Incomplete Ride",
            "creator_user_id": 9999
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.json())

    def test_07_create_ride_past_departure(self):
        """Should fail if departure time is in the past"""
        res = requests.post(f"{BASE_URL}/rides", json={
            "title": "Past Ride",
            "pickup_location": "UCLA",
            "destination": "LAX",
            "total_seats": 4,
            "creator_user_id": 9999,
            "departure_time": past_time(1),
            "is_round_trip": False
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.json())

    def test_08_create_round_trip_success(self):
        """Should create a round trip ride with return time"""
        res = requests.post(f"{BASE_URL}/rides", json={
            "title": "Round Trip Test",
            "pickup_location": "UCLA",
            "destination": "LAX",
            "total_seats": 4,
            "creator_user_id": 9999,
            "departure_time": future_time(24),
            "is_round_trip": True,
            "return_time": future_time(48)
        })
        self.assertEqual(res.status_code, 201)
        ride = res.json().get("ride")
        self.assertTrue(ride["is_round_trip"])
        self.assertIsNotNone(ride["return_time"])
        delete_ride(ride["id"])

    def test_09_create_round_trip_invalid_return_time(self):
        """Should fail if return time is before departure time"""
        res = requests.post(f"{BASE_URL}/rides", json={
            "title": "Bad Round Trip",
            "pickup_location": "UCLA",
            "destination": "LAX",
            "total_seats": 4,
            "creator_user_id": 9999,
            "departure_time": future_time(48),
            "is_round_trip": True,
            "return_time": future_time(24)
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.json())

    def test_10_create_ride_available_seats_calculated(self):
        """available_seats should be total_seats - 1 on creation"""
        ride = create_test_ride({"total_seats": 6})
        self.assertEqual(ride["available_seats"], 5)
        delete_ride(ride["id"])

    # ─── FILTERS ─────────────────────────────────────────────────────────────

    def test_11_filter_by_pickup_location(self):
        """Should return only rides matching pickup location"""
        ride = create_test_ride({"pickup_location": "UniquePickup123"})
        try:
            res = requests.get(f"{BASE_URL}/rides?pickupLocation=UniquePickup123")
            rides = res.json()
            self.assertGreater(len(rides), 0)
            for r in rides:
                self.assertIn("uniquepickup123", r["pickup_location"].lower())
        finally:
            delete_ride(ride["id"])

    def test_12_filter_by_destination(self):
        """Should return only rides matching destination"""
        ride = create_test_ride({"destination": "UniqueDest456"})
        try:
            res = requests.get(f"{BASE_URL}/rides?destination=UniqueDest456")
            rides = res.json()
            self.assertGreater(len(rides), 0)
            for r in rides:
                self.assertIn("uniquedest456", r["destination"].lower())
        finally:
            delete_ride(ride["id"])

    def test_13_filter_by_min_seats(self):
        """Should return only rides with at least minSeats available"""
        ride = create_test_ride({"total_seats": 6})  # available_seats = 5
        try:
            res = requests.get(f"{BASE_URL}/rides?minSeats=4")
            rides = res.json()
            for r in rides:
                self.assertGreaterEqual(r["available_seats"], 4)
        finally:
            delete_ride(ride["id"])

    def test_14_filter_min_seats_invalid(self):
        """Should return 400 for invalid minSeats value"""
        res = requests.get(f"{BASE_URL}/rides?minSeats=abc")
        self.assertEqual(res.status_code, 400)

    def test_15_filter_by_one_way(self):
        """Should return only one way rides"""
        ride = create_test_ride({"is_round_trip": False})
        try:
            res = requests.get(f"{BASE_URL}/rides?isRoundTrip=false")
            rides = res.json()
            self.assertGreater(len(rides), 0)
            for r in rides:
                self.assertFalse(r["is_round_trip"])
        finally:
            delete_ride(ride["id"])

    def test_16_filter_by_round_trip(self):
        """Should return only round trip rides"""
        ride = create_test_ride({
            "is_round_trip": True,
            "return_time": future_time(48)
        })
        try:
            res = requests.get(f"{BASE_URL}/rides?isRoundTrip=true")
            rides = res.json()
            self.assertGreater(len(rides), 0)
            for r in rides:
                self.assertTrue(r["is_round_trip"])
        finally:
            delete_ride(ride["id"])

    def test_17_filter_by_departure_date(self):
        """Should return only rides departing on the given date"""
        # Use UTC time explicitly to avoid timezone mismatch between test runner and server
        tomorrow_utc = (datetime.utcnow() + timedelta(days=1))
        tomorrow_str = tomorrow_utc.strftime('%Y-%m-%d')
        departure_utc = tomorrow_utc.strftime('%Y-%m-%dT12:00:00') + 'Z'

        ride = create_test_ride({"departure_time": departure_utc})
        try:
            res = requests.get(f"{BASE_URL}/rides?departureDate={tomorrow_str}")
            rides = res.json()
            self.assertGreater(len(rides), 0, "No rides found for departure date filter")
            # Allow one day buffer for UTC/LA timezone offset
            valid_dates = [
                tomorrow_str,
                (datetime.utcnow() + timedelta(days=2)).strftime('%Y-%m-%d')
            ]
            for r in rides:
                ride_date = r["departure_time"][:10]
                self.assertIn(ride_date, valid_dates,
                    f"Ride date {ride_date} not in expected dates {valid_dates}")
        finally:
            delete_ride(ride["id"])

    def test_18_filter_combined(self):
        """Should correctly combine multiple filters"""
        ride = create_test_ride({
            "pickup_location": "CombinedTestPickup",
            "destination": "CombinedTestDest",
            "total_seats": 5,
            "is_round_trip": False
        })
        try:
            res = requests.get(
                f"{BASE_URL}/rides?pickupLocation=CombinedTestPickup"
                f"&destination=CombinedTestDest&minSeats=3&isRoundTrip=false"
            )
            rides = res.json()
            self.assertGreater(len(rides), 0)
            for r in rides:
                self.assertIn("combinedtestpickup", r["pickup_location"].lower())
                self.assertIn("combinedtestdest", r["destination"].lower())
                self.assertGreaterEqual(r["available_seats"], 3)
                self.assertFalse(r["is_round_trip"])
        finally:
            delete_ride(ride["id"])

    def test_19_filter_no_results(self):
        """Should return empty list when no rides match filters"""
        res = requests.get(f"{BASE_URL}/rides?pickupLocation=ThisLocationDoesNotExistXYZ")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    # ─── POST /api/rides/:id/join ─────────────────────────────────────────────

    def test_20_join_available_ride(self):
        """A user should be able to join a ride with available seats"""
        ride = create_test_ride()
        try:
            res = requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
            self.assertEqual(res.status_code, 200)
            self.assertTrue(res.json().get("success"))
        finally:
            delete_ride(ride["id"])

    def test_21_cannot_join_full_ride(self):
        """Should not be able to join a full ride"""
        ride = create_test_ride({"total_seats": 2})  # only 1 available seat
        try:
            requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
            res = requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 814})
            self.assertEqual(res.status_code, 400)
        finally:
            delete_ride(ride["id"])

    def test_22_cannot_join_twice(self):
        """A user should not be able to join the same ride twice"""
        ride = create_test_ride()
        try:
            requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
            res = requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
            self.assertEqual(res.status_code, 400)
        finally:
            delete_ride(ride["id"])

    def test_23_creator_cannot_join_own_ride(self):
        """Creator should not be able to join their own ride"""
        ride = create_test_ride()
        try:
            res = requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 9999})
            self.assertEqual(res.status_code, 400)
        finally:
            delete_ride(ride["id"])

    # ─── POST /api/rides/:id/leave ────────────────────────────────────────────

    def test_24_leave_ride_you_joined(self):
        """A user should be able to leave a ride they joined"""
        ride = create_test_ride()
        try:
            requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
            res = requests.post(f"{BASE_URL}/rides/{ride['id']}/leave", json={"userId": 813})
            self.assertEqual(res.status_code, 200)
            self.assertTrue(res.json().get("success"))
        finally:
            delete_ride(ride["id"])

    def test_25_cannot_leave_ride_not_joined(self):
        """Should not be able to leave a ride you never joined"""
        ride = create_test_ride()
        try:
            res = requests.post(f"{BASE_URL}/rides/{ride['id']}/leave", json={"userId": 813})
            self.assertEqual(res.status_code, 400)
        finally:
            delete_ride(ride["id"])

    def test_26_seats_update_after_join_and_leave(self):
        """available_seats should decrement on join and increment on leave"""
        ride = create_test_ride()
        original_seats = ride["available_seats"]
        try:
            requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
            after_join = requests.get(f"{BASE_URL}/rides").json()
            joined_ride = next(r for r in after_join if r["id"] == ride["id"])
            self.assertEqual(joined_ride["available_seats"], original_seats - 1)

            requests.post(f"{BASE_URL}/rides/{ride['id']}/leave", json={"userId": 813})
            after_leave = requests.get(f"{BASE_URL}/rides").json()
            left_ride = next(r for r in after_leave if r["id"] == ride["id"])
            self.assertEqual(left_ride["available_seats"], original_seats)
        finally:
            delete_ride(ride["id"])

    def test_27_creator_cannot_leave_own_ride(self):
        """Creator should not be able to leave their own ride"""
        ride = create_test_ride()
        try:
            res = requests.post(f"{BASE_URL}/rides/{ride['id']}/leave", json={"userId": 9999})
            self.assertEqual(res.status_code, 400)
        finally:
            delete_ride(ride["id"])

    # ─── POST /api/rides/:id/remove-rider ────────────────────────────────────

    def test_28_creator_can_remove_rider(self):
        """Creator should be able to remove a passenger"""
        ride = create_test_ride()
        try:
            requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
            res = requests.post(f"{BASE_URL}/rides/{ride['id']}/remove-rider",
                json={"userId": 9999, "riderId": 813})
            self.assertEqual(res.status_code, 200)

            rides = requests.get(f"{BASE_URL}/rides").json()
            updated = next(r for r in rides if r["id"] == ride["id"])
            self.assertIn(813, updated["removed_passengers"])
            self.assertNotIn(813, updated["passengers"])
        finally:
            delete_ride(ride["id"])

    def test_29_non_creator_cannot_remove_rider(self):
        """Non-creator should not be able to remove a passenger"""
        ride = create_test_ride()
        try:
            requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
            res = requests.post(f"{BASE_URL}/rides/{ride['id']}/remove-rider",
                json={"userId": 813, "riderId": 813})
            self.assertEqual(res.status_code, 403)
        finally:
            delete_ride(ride["id"])

    def test_30_removed_rider_cannot_rejoin(self):
        """A removed rider should not be able to rejoin the ride"""
        ride = create_test_ride()
        try:
            requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
            requests.post(f"{BASE_URL}/rides/{ride['id']}/remove-rider",
                json={"userId": 9999, "riderId": 813})
            res = requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
            self.assertEqual(res.status_code, 403)
        finally:
            delete_ride(ride["id"])

    def test_31_remove_rider_frees_seat(self):
        """Removing a rider should increment available_seats"""
        ride = create_test_ride()
        original_seats = ride["available_seats"]
        try:
            requests.post(f"{BASE_URL}/rides/{ride['id']}/join", json={"userId": 813})
            requests.post(f"{BASE_URL}/rides/{ride['id']}/remove-rider",
                json={"userId": 9999, "riderId": 813})

            rides = requests.get(f"{BASE_URL}/rides").json()
            updated = next(r for r in rides if r["id"] == ride["id"])
            self.assertEqual(updated["available_seats"], original_seats)
        finally:
            delete_ride(ride["id"])

    # ─── DELETE /api/rides/:id ────────────────────────────────────────────────

    def test_32_non_creator_cannot_delete_ride(self):
        """A non-creator should not be able to delete a ride"""
        ride = create_test_ride()
        try:
            res = requests.delete(f"{BASE_URL}/rides/{ride['id']}", json={"userId": 813})
            self.assertEqual(res.status_code, 403)
        finally:
            delete_ride(ride["id"])

    def test_33_creator_can_delete_own_ride(self):
        """Creator should be able to delete their own ride"""
        ride = create_test_ride()
        res = requests.delete(f"{BASE_URL}/rides/{ride['id']}", json={"userId": 9999})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))

        rides_after = requests.get(f"{BASE_URL}/rides").json()
        ids = [r["id"] for r in rides_after]
        self.assertNotIn(ride["id"], ids)

    def test_34_delete_nonexistent_ride(self):
        """Deleting a ride that doesn't exist should return 404"""
        res = requests.delete(f"{BASE_URL}/rides/999999", json={"userId": 9999})
        self.assertEqual(res.status_code, 404)

    # ─── Race condition ───────────────────────────────────────────────────────

    def test_35_simultaneous_join_only_one_succeeds(self):
        """Two users joining the last seat at the same time — only one should succeed"""
        ride = create_test_ride({"total_seats": 2})
        self.assertEqual(ride["available_seats"], 1)

        results = []

        def join_ride(user_id):
            res = requests.post(f"{BASE_URL}/rides/{ride['id']}/join",
                json={"userId": user_id})
            results.append(res.status_code)

        try:
            t1 = threading.Thread(target=join_ride, args=(700,))
            t2 = threading.Thread(target=join_ride, args=(701,))
            t1.start()
            t2.start()
            t1.join()
            t2.join()

            self.assertEqual(results.count(200), 1, f"Expected 1 success, got {results.count(200)}")
            self.assertEqual(results.count(400), 1, f"Expected 1 failure, got {results.count(400)}")
        finally:
            delete_ride(ride["id"])


if __name__ == "__main__":
    unittest.main(verbosity=2)