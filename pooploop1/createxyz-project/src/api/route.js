async function handler({
  userId,
  location,
  address,
  description,
  cleanliness,
  rating,
  poopConsistency,
  images,
}) {
  const session = getSession();
  if (!session) {
    return { error: "Du må være logget inn for å legge til toaletter." };
  }

  try {
    return await sql.transaction(async (sql) => {
      const [toilet] = await sql`
        INSERT INTO toaletter (
          navn,
          posisjon,
          renhet,
          standard,
          totalvurdering,
          poop_consistency,
          synlighet
        )
        VALUES (
          ${address},
          ST_SetSRID(ST_MakePoint(${location.lng}, ${location.lat}), 4326),
          ${cleanliness},
          ${rating},
          ${(cleanliness + rating) / 2},
          ${poopConsistency},
          'public'
        )
        RETURNING id
      `;

      const points = 5;
      await sql`
        INSERT INTO point_transactions (
          user_id, 
          points, 
          activity_type, 
          toilet_id
        )
        VALUES (
          ${userId}, 
          ${points}, 
          'new_toilet', 
          ${toilet.id}
        )
      `;

      await sql`
        UPDATE users 
        SET points = points + ${points}
        WHERE id = ${userId}
      `;

      return { success: true, toiletId: toilet.id };
    });
  } catch (error) {
    console.error("Feil ved lagring av toalett:", error);
    return { error: "Kunne ikke lagre toalettet" };
  }
}