import { db } from "@/db";
import { creditTransactions, creditWallets, roomBookings } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

type AllowedRoomStatus = "scheduled" | "active";

type LockedRoomRecord = {
  id: string;
  hostId: string;
  title: string;
  status: string;
  autoAdmit: boolean;
  maxParticipants: number | null;
};

export type ReserveRoomSpotResult = {
  room: LockedRoomRecord;
  bookingId: string;
  bookingStatus: string;
  created: boolean;
};

const DEFAULT_MAX_PARTICIPANTS = 25;

export async function reserveRoomSpotTransactional(params: {
  roomId: string;
  userId: string;
  allowedStatuses: AllowedRoomStatus[];
  paymentMethod?: "bonus_credits" | "airtel_money" | "mtn_money" | "zamtel_money" | "zed_mobile";
  priceCredits?: number;
}) {
  const {
    roomId,
    userId,
    allowedStatuses,
    paymentMethod = "bonus_credits",
    priceCredits = 0,
  } = params;

  return db.transaction(async (tx): Promise<ReserveRoomSpotResult> => {
    const lockedRooms = await tx.execute<LockedRoomRecord>(sql`
      select
        id,
        host_id as "hostId",
        title,
        status,
        auto_admit as "autoAdmit",
        max_participants as "maxParticipants"
      from rooms
      where id = ${roomId}::uuid
      for update
    `);

    const room = lockedRooms[0];
    if (!room) {
      throw new Error("Room not found");
    }

    if (!allowedStatuses.includes(room.status as AllowedRoomStatus)) {
      throw new Error(
        room.status === "scheduled"
          ? "Room is not active yet."
          : "Room is not available for booking"
      );
    }

    const [existingBooking] = await tx
      .select({
        id: roomBookings.id,
        status: roomBookings.status,
      })
      .from(roomBookings)
      .where(and(eq(roomBookings.roomId, roomId), eq(roomBookings.userId, userId)))
      .limit(1);

    if (existingBooking?.status === "invited") {
      const bookingStatus = room.autoAdmit ? "admitted" : "booked";

      await tx
        .update(roomBookings)
        .set({ status: bookingStatus })
        .where(eq(roomBookings.id, existingBooking.id));

      return {
        room,
        bookingId: existingBooking.id,
        bookingStatus,
        created: true,
      };
    }

    if (existingBooking) {
      return {
        room,
        bookingId: existingBooking.id,
        bookingStatus: existingBooking.status,
        created: false,
      };
    }

    const maxParticipants = room.maxParticipants ?? DEFAULT_MAX_PARTICIPANTS;
    const [bookingCount] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(roomBookings)
      .where(eq(roomBookings.roomId, roomId));

    if ((bookingCount?.count ?? 0) >= maxParticipants) {
      throw new Error("This session is full.");
    }

    const bookingStatus = room.autoAdmit ? "admitted" : "booked";

    if (priceCredits > 0) {
      const learnerWalletRows = await tx.execute<{ id: string; balance: number }>(sql`
        select id, balance
        from credit_wallets
        where user_id = ${userId}::uuid
        for update
      `);

      const hostWalletRows = await tx.execute<{ id: string; balance: number }>(sql`
        select id, balance
        from credit_wallets
        where user_id = ${room.hostId}::uuid
        for update
      `);

      const learnerWallet = learnerWalletRows[0];
      const hostWallet = hostWalletRows[0];

      if (!learnerWallet || !hostWallet) {
        throw new Error("Wallet setup is incomplete for this booking.");
      }

      if (learnerWallet.balance < priceCredits) {
        throw new Error("You do not have enough demo credits for this session.");
      }

      await tx
        .update(creditWallets)
        .set({ balance: learnerWallet.balance - priceCredits, updatedAt: new Date() })
        .where(eq(creditWallets.id, learnerWallet.id));

      await tx
        .update(creditWallets)
        .set({ balance: hostWallet.balance + priceCredits, updatedAt: new Date() })
        .where(eq(creditWallets.id, hostWallet.id));
    }

    const [newBooking] = await tx
      .insert(roomBookings)
      .values({
        roomId,
        userId,
        status: bookingStatus,
        paidCredits: priceCredits,
        paymentMethod,
      })
      .returning({
        id: roomBookings.id,
        paidCredits: roomBookings.paidCredits,
      });

    if (priceCredits > 0) {
      await tx.insert(creditTransactions).values([
        {
          userId,
          counterpartyUserId: room.hostId,
          roomId,
          bookingId: newBooking.id,
          type: "session_booking_debit",
          direction: "debit",
          amount: priceCredits,
          paymentMethod,
          description: `Booked session: ${room.title}`,
          metadata: {
            roomTitle: room.title,
            bookingStatus,
          },
        },
        {
          userId: room.hostId,
          counterpartyUserId: userId,
          roomId,
          bookingId: newBooking.id,
          type: "session_booking_credit",
          direction: "credit",
          amount: priceCredits,
          paymentMethod,
          description: `Earned from session booking: ${room.title}`,
          metadata: {
            roomTitle: room.title,
            bookingStatus,
          },
        },
      ]);
    }

    return {
      room,
      bookingId: newBooking.id,
      bookingStatus,
      created: true,
    };
  });
}
