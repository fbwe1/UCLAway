const supabase = require('./supabaseclient');

// ─── Expire rides ─────────────────────────────────────────────────────────────
// Replaces pg_cron. Runs every 60 seconds in Node.js.
// Finds rides past their departure time, moves them to ride_history, deletes from rides.
// Works with any database — no Supabase-specific features used.
const expireRides = async (io) => {
  try {
    const now = new Date().toISOString();

    // 1. Find all expired rides
    const { data: expiredRides, error: fetchError } = await supabase
      .from('rides')
      .select('*')
      .lte('departure_time', now);

    if (fetchError) throw fetchError;
    if (!expiredRides || expiredRides.length === 0) return;

    // 2. Copy to ride_history before deleting
    const historyRows = expiredRides.map(ride => ({
      id: ride.id,
      pickup_location: ride.pickup_location,
      destination: ride.destination,
      title: ride.title,
      description: ride.description,
      total_seats: ride.total_seats,
      passengers: ride.passengers,
      creator_user_id: ride.creator_user_id,
      departure_time: ride.departure_time,
      return_time: ride.return_time,
      is_round_trip: ride.is_round_trip,
      created_at: ride.created_at,
      expired_at: now
    }));

    const { error: insertError } = await supabase
      .from('ride_history')
      .insert(historyRows);

    if (insertError) throw insertError;

    // 3. Delete expired rides from active table
    const expiredIds = expiredRides.map(r => r.id);
    const { error: deleteError } = await supabase
      .from('rides')
      .delete()
      .in('id', expiredIds);

    if (deleteError) throw deleteError;

    // 4. Notify all connected clients to remove expired rides from feed
    if (io) {
      expiredIds.forEach(id => {
        io.emit('rides-update', { eventType: 'DELETE', old: { id } });
      });
    }

    console.log(`[cron] Expired ${expiredRides.length} ride(s) to history`);
  } catch (err) {
    console.error('[cron] Error expiring rides:', err.message);
  }
};

// Called once from server.js after the server starts
// io is passed in so the cron job can emit socket events
const startCronJobs = (io) => {
  console.log('[cron] Starting cron jobs');
  expireRides(io); // run immediately on startup
  setInterval(() => expireRides(io), 60000); // then every 60 seconds
};

module.exports = { startCronJobs };