-- ============================================================================
-- roster_birthdate_update.sql — populate alumni_roster.birthdate for all 276
-- alumni, then propagate to linked profiles.birthdate.
--
-- Source: 'DATA TOP87 MASTER updated Bday.xlsm' (sheet Master, rows 44-321),
-- committee master roster. Every one of the 276 rows carries a birthdate;
-- years span 1966-1970, no unparseable or out-of-range values.
--
-- Run in the Supabase SQL editor AFTER 20260911_roster_birthdate.sql.
-- Idempotent: pure UPDATE by primary key, safe to re-run.
--
-- ⚠️ JOIN KEY IS alumni_roster.id, NOT (kelas, absen).
--    The spreadsheet skips 3F absen 26, so from 3F/26 onward its absen numbers
--    run one ahead of prod (prod renumbered 3F contiguously 1-46 at seed time).
--    Matching on (kelas, absen) would shift 21 birthdays onto the wrong person.
--    Rows below were matched on (kelas, nama_lengkap) at generation time and are
--    pinned here by prod uuid; the UPDATE re-asserts kelas/absen/name as a guard.
--
-- Policy on conflicts: the committee sheet wins. 6 linked profiles already held
-- a different self-entered date and are overwritten (confirmed 2026-09-11):
--    Surjaman Jahja 2025-06-15 -> 1968-06-15   (impossible year, clear typo)
--    Emanuel Timotius  1968-12-28 -> 1968-12-14
--    Iwan Tunggawidjaja 1968-10-15 -> 1968-10-03
--    Henri Marinus     1969-01-23 -> 1969-01-24
--    Maria Hiasinta    1968-12-12 -> 1968-12-14
--    Fanny Tjahjana    1968-07-25 -> 1968-06-25
-- ============================================================================

BEGIN;

CREATE TEMP TABLE _bd (
  id    uuid PRIMARY KEY,
  kelas text,
  absen int,
  nama  text,
  bd    date
) ON COMMIT DROP;

INSERT INTO _bd (id, kelas, absen, nama, bd) VALUES
  ('401c0612-19ae-435e-8bed-2656268670d1'::uuid, '3A', 1, 'E. ADI NUGROHO', DATE '1969-01-01'),
  ('eec6af50-a9f7-4ca8-93b1-01b53e02870e'::uuid, '3A', 2, 'AGUS BUDHIJANTO', DATE '1968-08-10'),
  ('507fef9d-e0f7-4356-958e-b2f1f2db432b'::uuid, '3A', 3, 'ANDI HEMAN WIDJAJANA', DATE '1968-10-05'),
  ('37860c50-9c02-4cfe-806e-485ea421e408'::uuid, '3A', 4, 'ARTHYA RUSTANDI', DATE '1967-10-14'),
  ('196f254a-673b-431f-abe0-cc0fdeca2d05'::uuid, '3A', 5, 'AUDY WIDJAJA', DATE '1969-09-04'),
  ('3fd20d28-ce82-45f1-a122-75a03df03f67'::uuid, '3A', 6, 'AUGUSTINUS FH HARDIMAN', DATE '1968-08-28'),
  ('e55d55d2-576b-4b9d-bf24-2b2a66b15a9b'::uuid, '3A', 7, 'BISMA STANIARTO', DATE '1968-03-19'),
  ('23d5267c-4e67-478d-a373-a89f63eae101'::uuid, '3A', 8, 'CHARLES UNSULANGI', DATE '1968-08-24'),
  ('8e398649-1727-4c33-897b-fbc23f1a9a4f'::uuid, '3A', 9, 'DANNY SUARDI', DATE '1969-02-27'),
  ('59405d7b-be06-4dea-b1ed-8a9cbc411a5e'::uuid, '3A', 10, 'DARWIN SALAMONY', DATE '1967-05-05'),
  ('501850a3-a7e6-48d5-910c-49ea18e2fe28'::uuid, '3A', 11, 'EDI MULYADI', DATE '1969-09-22'),
  ('c8980144-e833-4ed6-a9df-4b792ca166c5'::uuid, '3A', 12, 'EDUARD MULYONO', DATE '1968-11-13'),
  ('1f6f06cc-3eea-41a7-891f-26e6c5ad479f'::uuid, '3A', 13, 'F.X SARI INDRAJANI L.', DATE '1968-06-06'),
  ('21b73d10-344f-46d0-9a87-56fee57ed619'::uuid, '3A', 14, 'HARYANTO YAHJA SAPUTRA', DATE '1967-10-19'),
  ('d5a0e50b-7b56-43c5-8c21-7e7fa5d89517'::uuid, '3A', 15, 'HANRIKUS BAMBANG P.', DATE '1968-10-24'),
  ('5b299224-d4a5-4e02-83f8-4ec4259d13b8'::uuid, '3A', 16, 'HENRY WINARTA', DATE '1968-03-01'),
  ('8648ffbc-2545-484d-bb50-ed72c1038f34'::uuid, '3A', 17, 'INDAH L.S.', DATE '1968-12-08'),
  ('2bfd3c1e-68ee-4f03-9a9a-1625def12b3a'::uuid, '3A', 18, 'JEAN SUTARJA', DATE '1969-01-23'),
  ('152c48bd-7f09-4631-adf9-23720de5a9a0'::uuid, '3A', 19, 'JOLAN', DATE '1969-05-18'),
  ('a20a623e-b451-43fd-a1df-3cdf9e56ffa5'::uuid, '3A', 20, 'JULIUS ABYASA', DATE '1968-06-25'),
  ('429eef77-229f-4ff1-8798-403f795354b6'::uuid, '3A', 21, 'JOHANNES DWIARTANTO', DATE '1968-08-30'),
  ('5054272b-9cdb-4c28-84f7-42fedaac24a4'::uuid, '3A', 22, 'KOKO GUNADI R.', DATE '1969-02-17'),
  ('a0534f94-2cc3-4aa1-a282-0ed11927b8bb'::uuid, '3A', 23, 'LILY HERNAWAN', DATE '1968-05-17'),
  ('06203eec-7ac1-4dc4-804f-c4663ec5748a'::uuid, '3A', 24, 'LIM HU YEN', DATE '1968-10-27'),
  ('5139442d-9aa7-4769-a342-53f0cbf70d00'::uuid, '3A', 25, 'LINDY RUSTANDI', DATE '1968-12-15'),
  ('51ca003d-53e6-408c-996e-7ae1b959ee34'::uuid, '3A', 26, 'LUCAS PRANA SUNARYA', DATE '1968-10-25'),
  ('42df5b8e-a3ae-4b90-8977-8c9b2e16f4bf'::uuid, '3A', 27, 'MULJANA CHANDRA', DATE '1968-05-31'),
  ('027e7c8c-0597-4cc8-8cfa-4095b4426d6f'::uuid, '3A', 28, 'NANI WINARNI', DATE '1968-11-30'),
  ('05a0cdcf-331f-4124-b461-4bf595ae9be9'::uuid, '3A', 29, 'ONG JEN CHAU', DATE '1969-10-11'),
  ('8c8db1d1-5867-4fab-8f45-97fb840b4352'::uuid, '3A', 30, 'RIANY HARSIDI', DATE '1968-09-14'),
  ('cf995140-63fc-48a9-8379-5929f1586417'::uuid, '3A', 31, 'ROSSY', DATE '1968-04-13'),
  ('27c5aa75-0a46-443c-a365-1c879a4cb5d8'::uuid, '3A', 32, 'SHINTA DEWI T.', DATE '1968-11-04'),
  ('22bf3373-f514-4a6f-be21-4a3dfa05d474'::uuid, '3A', 33, 'SIGIT PRASETYA', DATE '1968-07-09'),
  ('b59221ca-afd3-414d-b811-b471570ab214'::uuid, '3A', 34, 'SUNARTO', DATE '1968-11-02'),
  ('23a347d4-d667-4a3e-a133-6528268d20b7'::uuid, '3A', 35, 'SUSAN LIMIAWATI H.', DATE '1969-05-14'),
  ('8e13c4bb-3ffa-486a-a499-bf329950532a'::uuid, '3A', 36, 'THEN TJUNG HIAN', DATE '1968-10-15'),
  ('5e27b561-ca04-4d35-a8d1-7b8258369b66'::uuid, '3A', 37, 'THOMAS TEGUH S.', DATE '1968-12-21'),
  ('3cb451bc-701b-45d7-9ac2-fa41facd791d'::uuid, '3A', 38, 'UUNG TJAHJAPUTRA', DATE '1968-09-08'),
  ('19aeb350-8cdb-4f88-ba31-8203ad900a95'::uuid, '3A', 39, 'WIDIA BUDHI SUSETYO', DATE '1968-07-21'),
  ('d781221d-abf0-466b-a6b2-62df2795a4e8'::uuid, '3A', 41, 'YENY RAHMAJANY', DATE '1970-02-11'),
  ('3b0e63be-2350-4bd0-b62f-4fd7aa396bda'::uuid, '3A', 42, 'ZAKI FIRMANSYAH', DATE '1969-02-01'),
  ('ab49ab8f-4b40-4e36-9353-22fc0a5d2681'::uuid, '3A', 43, 'WIWI KURNIADI YAHYA', DATE '1968-05-06'),
  ('a7c16ef3-a71b-44e4-931b-ea56453fa0d6'::uuid, '3B', 1, 'AGUS BUDHYHARTONO', DATE '1968-08-09'),
  ('8420d4f9-9336-48fb-8a21-31e511f5f915'::uuid, '3B', 2, 'ANDRE HENDARMAN', DATE '1968-06-30'),
  ('b3213e4b-b14a-4206-bd32-533e4ed6cb36'::uuid, '3B', 3, 'ANDY H. (ANTON)', DATE '1969-01-14'),
  ('a3f9e841-61d3-44dd-bacb-9cbc96c005f4'::uuid, '3B', 4, 'BONIFACUS BUDI P.', DATE '1968-01-28'),
  ('e877308f-aa0c-40b4-9137-4d09d3e28ea1'::uuid, '3B', 5, 'BONTOR SAUT TUA PANGGABEAN', DATE '1968-10-10'),
  ('d73d7b5b-b139-4279-a895-fec22d3d9f2e'::uuid, '3B', 6, 'BUDI SETIAWAN', DATE '1968-10-12'),
  ('fd3878a1-e5f0-4988-9a7a-b9d951df5030'::uuid, '3B', 7, 'CHRISTIANTI G. TIJONO', DATE '1969-06-07'),
  ('1efda32e-9d1e-4e96-87a6-8d84fe80c6fc'::uuid, '3B', 8, 'DAVID ADHITYO D.', DATE '1968-11-12'),
  ('0a4bfa59-a09c-4b69-a1e5-eb86061740e3'::uuid, '3B', 9, 'DENI DANIEL', DATE '1969-05-11'),
  ('6131f3d0-996e-4f0d-b975-21bf596d5977'::uuid, '3B', 10, 'EMANUEL TIMOTIUS', DATE '1968-12-14'),
  ('659c9b9e-2a4e-4cfd-a5f6-0fd9fc15521e'::uuid, '3B', 11, 'EVY KARTIKA DEWI', DATE '1968-04-20'),
  ('898a378c-d127-4f76-aaa5-00064b9b6bab'::uuid, '3B', 12, 'FEBRIAN TEGUH', DATE '1969-02-02'),
  ('e27c420b-1431-414d-84ed-dafba4574e3a'::uuid, '3B', 13, 'TOMMY ATMADJA', DATE '1967-04-05'),
  ('c5d26588-5427-44c0-a995-1e16f68d8aab'::uuid, '3B', 14, 'HERIADI PRIAMBODO', DATE '1968-12-18'),
  ('eca4a6e2-6e1e-463c-92b7-da11c64af325'::uuid, '3B', 15, 'HERJANTI WIDJAJA', DATE '1969-01-31'),
  ('950f6998-0f58-4bc6-8bcb-804e6b3ed332'::uuid, '3B', 16, 'INDRIANI', DATE '1968-03-01'),
  ('32ecd8ba-2e0b-4811-b597-62a21d9fd1bd'::uuid, '3B', 17, 'JULIUS STEPHANDI', DATE '1967-09-07'),
  ('01f5b5d7-cfca-4a60-a6f3-30ad05e34e26'::uuid, '3B', 18, 'KHOE ING SEN', DATE '1968-08-02'),
  ('5562b25a-b54b-4fca-8451-0c0a3af3c054'::uuid, '3B', 19, 'KWET PHIAO', DATE '1969-05-13'),
  ('a7e51597-7579-4773-817d-b9b434417996'::uuid, '3B', 20, 'LENNY GUNADI', DATE '1969-01-15'),
  ('2d9b0ebb-1342-4bd8-b35e-1657a1645d53'::uuid, '3B', 21, 'LEO SUTHA', DATE '1968-07-27'),
  ('6030fbcf-9ff9-4233-9d02-4e248e4eb511'::uuid, '3B', 22, 'PAOLI', DATE '1968-12-09'),
  ('d3f9522b-132e-4a95-bcbd-ee989455c191'::uuid, '3B', 23, 'LIEM KONG SHIUNG', DATE '1969-08-05'),
  ('f54b8ded-0ec2-4689-92ad-ade625dd6925'::uuid, '3B', 24, 'LILY KURNIADI', DATE '1968-07-15'),
  ('ea2810f8-97c7-4432-9960-03f9743200a7'::uuid, '3B', 25, 'LUCIA C.', DATE '1968-04-05'),
  ('c7a150f7-46f3-4ae7-b1c0-b2fca8ae7951'::uuid, '3B', 26, 'MULJANA PAULUS', DATE '1968-01-19'),
  ('95bf1b2a-4655-478b-8096-1b0212ef77ea'::uuid, '3B', 27, 'ONG SIUSIN', DATE '1968-10-28'),
  ('65a57211-9650-4cbd-b975-cd4859a2754d'::uuid, '3B', 28, 'RACHMAT', DATE '1968-06-16'),
  ('63cff705-67c4-47f8-bcca-1d4678045f29'::uuid, '3B', 29, 'RINA PRAMITA E.', DATE '1968-07-14'),
  ('e5de0cd2-0591-442f-b01f-6ec502dd77cf'::uuid, '3B', 30, 'ROSALINA HALIM', DATE '1969-04-08'),
  ('cd948da5-77ad-42af-80aa-57808065ba40'::uuid, '3B', 31, 'RUDY DARMA', DATE '1968-12-22'),
  ('a9d51fdb-5d01-4027-a57d-0cc4b976ab1b'::uuid, '3B', 32, 'SIU MING S', DATE '1968-02-27'),
  ('9a564d60-6748-4ee2-9a08-b871ed6e9c00'::uuid, '3B', 33, 'SUSANA SALIM', DATE '1969-04-17'),
  ('76227bc0-83c7-44db-a572-2fc04c42aadc'::uuid, '3B', 34, 'SYLVIA KAMADJAJA', DATE '1968-10-22'),
  ('e3a90f22-c100-4d89-918f-626a140ef256'::uuid, '3B', 35, 'SEPTIMIUS IRWAN D.', DATE '1968-09-16'),
  ('b2ac95df-d878-471a-8f59-fd7763ef4cd4'::uuid, '3B', 36, 'TAN SIU IYEN', DATE '1969-11-25'),
  ('aaf21ff5-2722-43f1-a62c-e24993ab3456'::uuid, '3B', 37, 'TJIANG HUE (WINARTA)', DATE '1968-02-03'),
  ('778cd2f2-8735-4e70-bc74-75349cead2c8'::uuid, '3B', 38, 'TENACIOUS NIRWANSYAH T.', DATE '1969-12-20'),
  ('c23eda3d-9f14-47e2-82d0-2b7e54f19ef7'::uuid, '3B', 39, 'THE MAZMUR', DATE '1968-07-31'),
  ('0944837d-2f12-4f03-8e1e-430a8c2ff101'::uuid, '3B', 40, 'HERYANTO (Tjiong Hung Fu)', DATE '1969-08-29'),
  ('20f4df51-7e49-450c-b1dc-6fa98018ea59'::uuid, '3B', 41, 'T. TJEN TJUNG', DATE '1969-08-18'),
  ('ddb90f26-9ee7-4a49-9cad-6401d3bfb86d'::uuid, '3B', 42, 'VERONICA SUSANTI', DATE '1967-11-22'),
  ('05d85170-655a-485a-9fc5-5c0b7cec2c4a'::uuid, '3B', 43, 'WILLIAM P.', DATE '1968-09-30'),
  ('86d4b59b-3919-472a-a413-141c08a8aace'::uuid, '3B', 44, 'YOHANES DARMAWAN EDY', DATE '1968-04-26'),
  ('af80e790-350d-4e80-90c5-8c8ebbbcf412'::uuid, '3B', 45, 'IWAN TUNGGAWIDJAJA', DATE '1968-10-03'),
  ('8d579e0e-fefb-42b5-b4eb-c4e14021cc78'::uuid, '3C', 1, 'ANASTASIA MEDIANA', DATE '1968-03-21'),
  ('376ba95d-fee0-4528-a7f7-c95f56300a07'::uuid, '3C', 2, 'ANTONIUS DJALU S', DATE '1967-12-16'),
  ('75b0ed51-2f59-494c-b051-1cab8b426688'::uuid, '3C', 3, 'B. EDDY LUCKY', DATE '1968-05-04'),
  ('83b049ba-2c9e-47cf-b5ca-f18e794cebf3'::uuid, '3C', 4, 'BOLO DWIARTOMO', DATE '1968-10-30'),
  ('c006d69a-79ac-4e6e-aacf-e28559b869f8'::uuid, '3C', 5, 'CHRISTIE KUSNANDAR', DATE '1968-08-15'),
  ('5771c2f2-9224-40cc-aac7-86ccdc79a2d2'::uuid, '3C', 6, 'DADAN MULYAWAN', DATE '1969-08-24'),
  ('2fdd917c-d50c-4293-99c2-b17a372252d0'::uuid, '3C', 7, 'DANIEL LM', DATE '1968-08-19'),
  ('7db65464-082c-4d1b-8f7d-5cb65d41a520'::uuid, '3C', 8, 'DEWI YANTI', DATE '1969-01-14'),
  ('566a6521-dc7f-40c8-a4cf-4ff33d3e1af5'::uuid, '3C', 9, 'ERWIN B. ADHIWIJAYA', DATE '1968-12-08'),
  ('19475c26-c6c2-4054-9eb7-3b499920430c'::uuid, '3C', 10, 'FENDI RUSMANA', DATE '1969-04-12'),
  ('e72c5f00-b1bf-4b12-a353-247c9e3b990c'::uuid, '3C', 11, 'FRANCISCUS LEO LUMME', DATE '1968-10-04'),
  ('aca0dd0d-6c30-4c8a-9538-d0881113a463'::uuid, '3C', 12, 'FREDY DISASTRA', DATE '1969-02-03'),
  ('ad25258f-b0c9-43ad-9052-437ef82270ef'::uuid, '3C', 13, 'GANDA LESMANA', DATE '1968-11-26'),
  ('2f27ac49-10f2-461c-9e8d-fdb2af3e99f6'::uuid, '3C', 14, 'HARTONO RIANTO', DATE '1969-06-04'),
  ('ba5d0987-b7e6-4fba-957a-136ad836a84a'::uuid, '3C', 15, 'HENDARMIN RUSTANDI', DATE '1969-04-12'),
  ('82427182-a9f4-446b-83c1-048003e004f0'::uuid, '3C', 16, 'HENDRA HARNOKO', DATE '1967-07-14'),
  ('ee6f6fe7-0ad3-40bc-a268-f18eee48351d'::uuid, '3C', 17, 'HENDY MARTONO', DATE '1968-01-04'),
  ('a4918812-ed3f-4b67-bcca-763264d71f96'::uuid, '3C', 18, 'HENRI MARINUS', DATE '1969-01-24'),
  ('c6ba8522-685c-45c2-9cc5-005f93e9b8ec'::uuid, '3C', 19, 'HERLINA SURYA', DATE '1969-05-23'),
  ('41676267-b199-4896-86c9-8bf653d0b5fd'::uuid, '3C', 20, 'HOUW TJOEI ING', DATE '1968-09-02'),
  ('3c886891-103d-47fd-804b-7287f9375b80'::uuid, '3C', 21, 'AGUS PURNAWAN P', DATE '1968-08-21'),
  ('e4dcef78-f751-4a76-b22f-235aa1d06391'::uuid, '3C', 22, 'IGN. S. HAMDANI', DATE '1968-05-06'),
  ('2da142b5-e861-4a51-b682-ca3392b070c4'::uuid, '3C', 23, 'INGRID VIVIANTI SANTOSA', DATE '1969-04-28'),
  ('c091c360-2a3a-4eb3-bec7-47018f9c63f9'::uuid, '3C', 24, 'INNIGO W.S.', DATE '1968-08-17'),
  ('98f65437-dc3b-4d98-926d-eab43e0ce621'::uuid, '3C', 25, 'IVY ISKANDAR', DATE '1968-11-20'),
  ('c3026fc5-bfc3-4cab-a40a-b118795d38a0'::uuid, '3C', 26, 'JAMES LINCOLN STIADY', DATE '1968-12-30'),
  ('e0b2dd85-3512-44af-bcf7-7e40475fe913'::uuid, '3C', 27, 'JUDY WAROUW', DATE '1968-01-20'),
  ('6d40d0a9-7899-4e48-96a6-f79bf195aa77'::uuid, '3C', 28, 'LILY SUHENI SAPUTRA', DATE '1968-09-07'),
  ('8a886de4-1ae1-444a-8174-1008196ee3e6'::uuid, '3C', 29, 'LUCY ARIANTY', DATE '1969-01-01'),
  ('efb30e95-f55a-41da-b4e8-7be8c4f26e35'::uuid, '3C', 30, 'MARIUS R.', DATE '1968-05-12'),
  ('1b60e3ad-df36-41af-9af0-17cae0e0a4f0'::uuid, '3C', 31, 'MARLINAWATI P.', DATE '1968-01-27'),
  ('db1f4389-0fb1-4d52-9949-c30fb985eeb4'::uuid, '3C', 32, 'PAULUS GUNAWAN T.', DATE '1968-10-22'),
  ('816e5437-7355-4e76-9c5f-2f3295f26206'::uuid, '3C', 33, 'QUENNY HENDAYANI', DATE '1970-01-18'),
  ('c1ad1c58-5489-4e21-a3f1-10fbf6336a97'::uuid, '3C', 34, 'RAMLAN HANDOKO', DATE '1969-11-20'),
  ('eecc5d7b-6b0e-4a07-b1bb-3157140a58de'::uuid, '3C', 35, 'RATNA SIDHARTA', DATE '1968-05-02'),
  ('78a3058b-7b05-40cb-8687-7f2b2ffe39c1'::uuid, '3C', 36, 'RIVAN', DATE '1969-04-01'),
  ('7132c2e6-4f41-4748-9d37-345d7e9c8e4d'::uuid, '3C', 37, 'RUDY P.', DATE '1968-07-26'),
  ('76c9a757-0847-4d4b-be35-9be4ed06646e'::uuid, '3C', 38, 'SEBASTIAN ARIO SOBO', DATE '1968-02-01'),
  ('08762485-2d39-4cb3-93f1-ce41684b6eab'::uuid, '3C', 39, 'SISCA OKTAVIANA TASIRAN', DATE '1968-10-11'),
  ('1771976a-a708-4bc2-a98a-4a5a1f9ac601'::uuid, '3C', 40, 'SUWITHO THOMAS', DATE '1969-09-20'),
  ('68359019-175f-42fc-893e-86b1aee56152'::uuid, '3C', 41, 'TEDY SUGIARTO', DATE '1968-06-07'),
  ('a2c53de8-ce5c-45a1-87f1-35f8a6840b09'::uuid, '3C', 42, 'TONY KUSNANDAR', DATE '1969-03-24'),
  ('b82b268b-a1a5-4aee-a1f9-1ab04a2a2830'::uuid, '3C', 43, 'YENNY SETIAWAN', DATE '1968-05-02'),
  ('e6001bd5-65fd-43af-959d-4aa4914fe1c3'::uuid, '3C', 44, 'JOHANES SUPRIHADI', DATE '1968-01-28'),
  ('c50945ab-ea43-4f55-ac10-a2bb838d1f1a'::uuid, '3C', 45, 'LARRY SUTIKNO', DATE '1968-09-08'),
  ('1d6b5045-decf-4318-9627-58afa21aed21'::uuid, '3D', 1, 'ALOYSIUS SANTOSA', DATE '1969-03-15'),
  ('99bb9135-46aa-4efe-b10c-81b475c49359'::uuid, '3D', 2, 'AMI JULIANTI', DATE '1969-07-01'),
  ('f2e7d466-6749-41cb-941e-0ab3d11c0579'::uuid, '3D', 3, 'ANDREAS TEDY', DATE '1968-12-13'),
  ('c0d778bf-58a3-4ae5-a660-4c856a637162'::uuid, '3D', 4, 'BONITA PRAWIRODIHARDJO', DATE '1968-10-12'),
  ('f8c37ff3-309f-4b76-9cd3-17a5b7b72007'::uuid, '3D', 5, 'CATANIA AMBAR G.H.', DATE '1967-11-25'),
  ('7e760cf2-a627-4682-8b2a-fec5d00937b1'::uuid, '3D', 6, 'CHRISTINA BOEDIARTO', DATE '1968-12-09'),
  ('6f3e21bb-b0be-4b51-8252-ac5833ceac87'::uuid, '3D', 7, 'CYNTHIA KRISTIADJI', DATE '1969-02-21'),
  ('33d12c80-1966-43a3-8271-48a893c6b723'::uuid, '3D', 8, 'DEWI FADJAR SURJANTO', DATE '1968-08-04'),
  ('6eb97187-723c-4da9-9096-b9882b66924d'::uuid, '3D', 9, 'DJUWITA ISKANDAR', DATE '1968-12-24'),
  ('1cd56c78-61a1-44a7-bfff-12a2f04023b1'::uuid, '3D', 10, 'ERNY HERYAWATI SUTANTO', DATE '1968-02-25'),
  ('0d43b3f8-da21-4cbe-aadc-4a573589193a'::uuid, '3D', 11, 'FAN HWA SUN', DATE '1968-08-31'),
  ('2a84cb84-e9fc-4a30-9ccd-27a0a3ae0c3b'::uuid, '3D', 12, 'FENTY LESTARI SUNARJO', DATE '1968-05-09'),
  ('790a9009-e9f5-47de-9edc-124e98000a30'::uuid, '3D', 13, 'GERARDUS DJUDJU KUSUMO', DATE '1969-07-25'),
  ('a8044139-f5b1-4d2b-80cd-956d669991a9'::uuid, '3D', 14, 'HADI SASTRA', DATE '1969-04-01'),
  ('5024db92-93d8-4ff8-b1c7-93228e9bb4ef'::uuid, '3D', 15, 'HADI TJANDRA T.', DATE '1968-10-29'),
  ('8a8f253e-8701-4e4d-8e2d-9ac0a7f31f81'::uuid, '3D', 16, 'HENDRA SETIAWAN T.', DATE '1969-02-19'),
  ('f1a49463-875d-4fd8-bdd9-0e31a9d9747e'::uuid, '3D', 17, 'HERMAN JOSEPH M.', DATE '1968-04-09'),
  ('d2b19869-4669-429d-b130-a341d0fbe84e'::uuid, '3D', 18, 'INGE R.D. DARMASETIAWAN', DATE '1968-09-02'),
  ('4327b7f5-4ace-4b97-8d7c-9906e7eeb6c8'::uuid, '3D', 19, 'JANTO SLAMET', DATE '1968-10-15'),
  ('10acbcf5-1e95-41c2-b61e-1118a4d8486b'::uuid, '3D', 20, 'JENIE ARYANTI', DATE '1968-12-16'),
  ('8521ff22-80dc-43bf-b9d2-b50dd0170a57'::uuid, '3D', 21, 'JIE KIAO LING', DATE '1968-06-09'),
  ('3084b8ee-5800-4b59-bafa-2c241f3b6bb6'::uuid, '3D', 22, 'KRISTINA', DATE '1969-10-29'),
  ('4904e9e9-6250-499b-8767-b3ca374e88ce'::uuid, '3D', 23, 'LANAWATY', DATE '1967-07-07'),
  ('adc75305-862b-42cf-af8c-5110b902b175'::uuid, '3D', 24, 'LANNY TEDJOKUSUMO', DATE '1969-01-13'),
  ('93c4194b-debe-4139-a41d-8785b8311179'::uuid, '3D', 25, 'LAURA SITOMPUL', DATE '1968-11-19'),
  ('48842daa-521b-4a31-aa31-c5964bc4a2c5'::uuid, '3D', 26, 'LELI ERIKA', DATE '1969-05-20'),
  ('7bdba935-cb9e-4855-a69b-212256d25ee4'::uuid, '3D', 27, 'LIANITA', DATE '1969-06-11'),
  ('d19c6698-7066-42a7-9ae3-a4d07e265eed'::uuid, '3D', 28, 'LIM ZHI GING', DATE '1969-06-06'),
  ('da5bed88-4384-4063-b54a-ca615ef8ee3c'::uuid, '3D', 29, 'LINDA TANUMIHARDJA', DATE '1969-05-25'),
  ('c919b465-5596-49de-b38b-eba96e50f723'::uuid, '3D', 30, 'LUCIA WIRIAPRANATA', DATE '1968-12-13'),
  ('be4c38b0-4e0e-411a-824b-a92a5240c501'::uuid, '3D', 31, 'MARIA ELIZABETH R.R.', DATE '1968-03-11'),
  ('ab0e1c44-66e1-45b7-8bda-d0c195cfde41'::uuid, '3D', 32, 'MARIA HIASINTA FARIDA', DATE '1968-12-14'),
  ('a6e78970-215b-4314-9536-0e05d973034c'::uuid, '3D', 33, 'MARIETTA SHANTI', DATE '1969-05-01'),
  ('d92e3079-1bfe-48d5-acb7-5df4c77134b0'::uuid, '3D', 34, 'MEILYWATI', DATE '1968-05-21'),
  ('405b3b3c-bf07-4f07-8384-0c325c89bfa7'::uuid, '3D', 35, 'MINARLI RIDWAN', DATE '1968-05-31'),
  ('d1fc6793-74e5-4b48-9662-29a0dc3f45d4'::uuid, '3D', 36, 'NATASYAH TJIA SAU FU', DATE '1968-05-10'),
  ('b4c4d251-75dc-4df8-86d3-8ef18612cfa5'::uuid, '3D', 37, 'PAUL', DATE '1969-02-05'),
  ('6fbb22b8-7e46-4378-ae52-f189a77f9477'::uuid, '3D', 38, 'PENI SURYANI', DATE '1969-02-19'),
  ('f1d7bc4a-1190-409d-b132-01d3aa2a7963'::uuid, '3D', 39, 'RATNADEWI', DATE '1969-01-30'),
  ('cfa82eca-e607-4449-9d5d-62068143e8f5'::uuid, '3D', 40, 'RIDWAN TJANDRADJAJA', DATE '1968-11-14'),
  ('12c68fb0-ba5f-4153-9976-c9af64e46815'::uuid, '3D', 41, 'SANDRA B. SAMUEL', DATE '1969-02-21'),
  ('55864541-7373-41e0-81b1-dd00fb6c2144'::uuid, '3D', 42, 'SASMOKO ADISANTOSO', DATE '1966-12-11'),
  ('c564b1d5-e519-4e06-a777-a435a77abf7c'::uuid, '3D', 43, 'SHI GWAT ING JOYCE', DATE '1968-07-29'),
  ('77bc7ce1-b928-430a-9dde-8f50386e9a57'::uuid, '3D', 44, 'SU FEN', DATE '1968-06-28'),
  ('f9030204-df83-406a-b533-277a8c003fbb'::uuid, '3D', 45, 'LEONARDUS SURYAMAN YAHYA', DATE '1968-06-15'),
  ('fdb4d52d-55b0-4ff7-a27a-63fdf5c950a7'::uuid, '3D', 46, 'TAN HOAT LIANG', DATE '1968-03-09'),
  ('962149aa-3d1f-45a3-86b0-b6fbadda938e'::uuid, '3D', 47, 'THE ANDREAS ANDI', DATE '1968-04-17'),
  ('1d428f5b-d6e2-4f16-9e91-2ef35e4b927e'::uuid, '3D', 48, 'WAHYUDI HARSONO', DATE '1968-05-13'),
  ('5527cd84-06e6-495a-94fe-ea75cf890689'::uuid, '3D', 49, 'WINARYO RIDWAN', DATE '1969-08-03'),
  ('234f7475-7d43-4051-9e6d-3bd604cc339d'::uuid, '3D', 50, 'YESAYA', DATE '1968-08-18'),
  ('fd6a027a-d81e-41e4-92e4-e9b1967ed7fb'::uuid, '3E', 1, 'ALBERTUS PURWANTO', DATE '1969-02-26'),
  ('8a79b57e-5bce-4a10-9568-7207ef2b1524'::uuid, '3E', 2, 'ANIES LASTIATI', DATE '1969-03-08'),
  ('6c6addd4-7a1d-4411-9989-9854ac0bca3a'::uuid, '3E', 3, 'ARYANI H.', DATE '1968-05-21'),
  ('f0e85ad5-1575-42c1-ad85-13c01b8fafd4'::uuid, '3E', 4, 'BERNADETHA LILIAWATY', DATE '1968-10-25'),
  ('360b8a08-55bf-4307-887b-4f57513812ec'::uuid, '3E', 5, 'C.M. JANUAR SOESANTO', DATE '1968-01-13'),
  ('97db6ede-eea7-45b5-92d5-69f983bf1ba1'::uuid, '3E', 6, 'CHRISTINA CHANDRAWIGUNA', DATE '1968-12-16'),
  ('9746a18f-be94-43ad-a3f3-d241b8e63709'::uuid, '3E', 7, 'EMILIA RANTIAMA', DATE '1969-07-03'),
  ('72b00718-3f69-41e8-aaa4-9efda629920d'::uuid, '3E', 8, 'ENDRO PRIOSAMUDRO', DATE '1968-09-16'),
  ('28bcafd2-a0cd-4ea9-a08e-286e7eaffb6a'::uuid, '3E', 9, 'FERA ARIFIN', DATE '1969-02-23'),
  ('d85c513c-5e06-4832-a02f-dc5b7ace3589'::uuid, '3E', 10, 'DIONICEA HANNY S.', DATE '1968-09-10'),
  ('fa0481c6-b134-45aa-9450-a54874418ec7'::uuid, '3E', 11, 'HARIJANTO JOSWARA', DATE '1968-08-29'),
  ('04a86a1e-0dc6-42c2-aced-f38d0c49432b'::uuid, '3E', 12, 'HENDRA LIMANDJAJA', DATE '1968-02-23'),
  ('0c33f221-2057-481c-82c6-80aa07af9b32'::uuid, '3E', 13, 'HERRY GUNADI', DATE '1968-07-07'),
  ('316af020-4ed8-433e-aafe-d82a3f5dd426'::uuid, '3E', 14, 'REZA LINGGA', DATE '1967-09-22'),
  ('17e35c76-9a64-4482-889d-c0e15f50b131'::uuid, '3E', 15, 'IKE TJANDRADINATA', DATE '1968-09-15'),
  ('27a43e9f-34c4-4381-be2c-b9ef243c5896'::uuid, '3E', 16, 'JACOB F. PATTIWAEL', DATE '1968-11-21'),
  ('3e88927b-75eb-4c30-bc46-5abf4aabaf5b'::uuid, '3E', 17, 'JENNY GEERTRUIDA E.S.', DATE '1969-01-13'),
  ('24adbf7a-f372-45a2-8fee-da1b78fd9341'::uuid, '3E', 18, 'JERRY MULYADI', DATE '1968-03-16'),
  ('ec9b0b13-c90f-4314-9e24-136e988e7767'::uuid, '3E', 19, 'MHG JHYS HENNI SRIWATI', DATE '1968-08-14'),
  ('cdfc56bc-9136-4233-b28a-0be9abcd0a8e'::uuid, '3E', 20, 'ML JULIA PUSPASARI', DATE '1968-07-14'),
  ('a5eb9f60-f46c-4e91-924a-5423f35dd513'::uuid, '3E', 21, 'KARADI HANAM', DATE '1968-12-21'),
  ('de26ad98-4b1b-41b1-8f5c-076f5a034724'::uuid, '3E', 22, 'LENNA', DATE '1968-08-06'),
  ('ddb6fc81-1657-4e2e-98d6-f673207214d7'::uuid, '3E', 23, 'LILY SURJONO', DATE '1969-08-09'),
  ('120dce47-efe4-49f4-bf2b-9cb1b2aa5909'::uuid, '3E', 24, 'LINA GUNAWAN', DATE '1969-05-27'),
  ('7952e89d-804a-4a8a-9b15-73f964ec1d7e'::uuid, '3E', 25, 'SUHARTINI DHARMANATA', DATE '1968-02-15'),
  ('ec1fba10-f0a7-4a09-9c9b-385271ea669a'::uuid, '3E', 26, 'LUKMAN C.', DATE '1969-02-10'),
  ('1591fd20-0012-47f2-ab6b-29a4b803cb05'::uuid, '3E', 27, 'METTY MELAWATI', DATE '1968-05-26'),
  ('3dbf5cab-9cb5-46a0-b3a1-e245266f47c0'::uuid, '3E', 28, 'NANCY C. THYMA', DATE '1969-02-22'),
  ('1531d0dd-6fb4-4134-bf77-4f7435b62776'::uuid, '3E', 29, 'NICO', DATE '1969-10-20'),
  ('ef7ff137-bea2-46b0-b366-254f9baf0292'::uuid, '3E', 30, 'PRAJNA SANTI B', DATE '1969-02-13'),
  ('1d80506f-ead5-4ba2-b6f1-78e782215a1d'::uuid, '3E', 31, 'PRILANTINA P. PRISCILLA', DATE '1968-04-04'),
  ('87393d97-668b-4f92-978e-8e2c44e71eac'::uuid, '3E', 32, 'RATNAWATY IRAWAN', DATE '1968-12-22'),
  ('9466698c-bea2-4914-98b6-e61f591d9201'::uuid, '3E', 33, 'RICKY ISKANDAR', DATE '1969-07-14'),
  ('999d1ec5-abb8-43d7-ad54-9225152912d7'::uuid, '3E', 34, 'R. ROBBY KURNIAWAN T.', DATE '1968-04-04'),
  ('2d1fdf57-5eb9-4d9c-a4af-5efc13e924d7'::uuid, '3E', 35, 'ROCHAJATI', DATE '1968-03-17'),
  ('5004b708-95b7-4224-9d29-8fbef32f3e3f'::uuid, '3E', 36, 'RUSLIM LIMIWIDJAJA', DATE '1968-07-06'),
  ('209c6cdb-38ab-493f-8514-02ad3023b405'::uuid, '3E', 37, 'FA SAPTOADJI ARIBOWO', DATE '1968-04-24'),
  ('3eb7056c-5c7b-4dd7-9be3-177a49387308'::uuid, '3E', 38, 'SOENARDI KUSUMO K.', DATE '1969-03-28'),
  ('f96fc21d-81fc-45fe-95c9-3706c1e3411b'::uuid, '3E', 39, 'SRI MULIAJATI', DATE '1967-06-20'),
  ('677f2385-0948-4783-a5ef-1e249390736c'::uuid, '3E', 40, 'SUCY MULYADI', DATE '1969-03-05'),
  ('b03540b2-7b95-4417-8937-7a7354d57deb'::uuid, '3E', 41, 'TH. TING HWEE LIAN', DATE '1968-09-12'),
  ('d510534c-a9ee-4b81-af4e-585f1e52bacb'::uuid, '3E', 42, 'WIDYANA S. HARDJANI', DATE '1968-09-19'),
  ('6ec41f0b-3f12-4b35-87a3-8942ba2c2102'::uuid, '3E', 43, 'WIWING ISNATA', DATE '1969-06-12'),
  ('17a1f34f-111d-4e23-8b5b-d215f0f55c39'::uuid, '3E', 44, 'YANTY GODJALI', DATE '1968-12-06'),
  ('d4dafee2-1240-4caf-b59d-659c9873c28c'::uuid, '3E', 45, 'YENNY SONTANI', DATE '1968-09-01'),
  ('e644c57e-b809-41d4-bad1-81bfa9b2c6bd'::uuid, '3E', 46, 'YETTY R.', DATE '1968-03-13'),
  ('a12c27c7-7c61-4381-b154-dc13cc434c63'::uuid, '3E', 47, 'ZANNY', DATE '1968-04-01'),
  ('692ec0fd-0725-483c-be9e-424bd5d8dc1a'::uuid, '3E', 48, 'FERYANTI SETIAWAN', DATE '1968-08-22'),
  ('81f3014b-1bc8-4e6e-a9d8-e2fc09c4e42f'::uuid, '3F', 1, 'ALFONSUS TJAHJADI', DATE '1969-04-10'),
  ('43e9c44b-e695-422e-93bb-6b7677fe47e2'::uuid, '3F', 2, 'A. SRI PRACAYANTI', DATE '1968-11-11'),
  ('befa62ce-49ad-4e7f-ad29-dba16ccff9e0'::uuid, '3F', 3, 'ANDREAS BUDI RACHMAT', DATE '1969-09-06'),
  ('36ab90b7-9303-476d-b3c3-db7215e4ad86'::uuid, '3F', 4, 'ASWIN GUNADI', DATE '1969-01-29'),
  ('ed25e7a7-32d7-452f-ac9b-feb56130ad39'::uuid, '3F', 5, 'BANGKIT STEFANUS', DATE '1968-10-15'),
  ('bdeb658c-4ad1-453b-91f0-69fcdb3170be'::uuid, '3F', 6, 'CHRISTINA JULIANA', DATE '1968-10-03'),
  ('f614a36d-b6a2-4d28-9697-c0b3f8d7d8e0'::uuid, '3F', 7, 'DIAH PRAMESTI ROSA', DATE '1969-03-03'),
  ('10a5e20d-d2a4-42a9-ae9a-1ae204571807'::uuid, '3F', 8, 'ELINAWATI SUTANTO', DATE '1967-05-03'),
  ('a9744144-3bf6-4ddf-ad91-801f384c4578'::uuid, '3F', 9, 'ELVY LUCIANA THEN', DATE '1969-05-10'),
  ('243749d5-3195-4016-8ceb-a8e8b85b6ad2'::uuid, '3F', 10, 'ERLIS SUTRISNO', DATE '1968-01-06'),
  ('b3f6db52-d6d4-44b6-bd2a-6f2eaf25ec50'::uuid, '3F', 11, 'EVA MARTONO', DATE '1969-05-05'),
  ('c35e3ab6-c06d-4762-b487-d6c41ea87e67'::uuid, '3F', 12, 'FANNY TJAHJANA', DATE '1968-06-25'),
  ('d89cf186-e9de-450d-a8b3-dad04bedadeb'::uuid, '3F', 13, 'FRIDA WINATA', DATE '1969-01-17'),
  ('bdd5319c-2f80-4ab9-af35-3a132a42ef46'::uuid, '3F', 14, 'F.X. ALEX SIANTAN', DATE '1968-08-25'),
  ('69f49552-1f29-47db-b581-5d7977365e91'::uuid, '3F', 15, 'IGN. S. BUDI SATRIO', DATE '1968-04-27'),
  ('f3783359-887a-4a51-ae54-531dded995fd'::uuid, '3F', 16, 'IRAWAN ISKANDAR', DATE '1967-12-01'),
  ('985b6952-9fa6-45aa-984e-a74652c9c34c'::uuid, '3F', 17, 'JEFFREY B. VILLANUEVA', DATE '1969-05-21'),
  ('fead8dbc-43aa-4f35-9f22-43d259fc674e'::uuid, '3F', 18, 'JULIA YANI', DATE '1968-07-15'),
  ('fcc0391b-90c2-4b67-be90-e1564395ced7'::uuid, '3F', 19, 'KHO EYKE MARYATI', DATE '1969-03-15'),
  ('dd411633-873e-4d67-9825-c25ff72f80e2'::uuid, '3F', 20, 'LAUW HOUW MEI', DATE '1968-03-24'),
  ('c8551e6e-ea06-4887-911c-bb1d64963407'::uuid, '3F', 21, 'LAUW LUKMAN HENDIK', DATE '1969-01-07'),
  ('62ff029b-fd03-49aa-86c5-28b54e5a3297'::uuid, '3F', 22, 'LILY SALIM', DATE '1969-10-05'),
  ('b46c8ecc-bf07-4cd6-8218-91386eab4c1b'::uuid, '3F', 23, 'LIM SIOE TJOE', DATE '1968-07-29'),
  ('6e3af4e0-42e1-42c9-a62b-84607964b3e1'::uuid, '3F', 24, 'MARIA B. MEITY', DATE '1968-05-29'),
  ('47e3b869-247a-4515-8182-b22ff474b378'::uuid, '3F', 25, 'MELINDA HALIM', DATE '1969-01-14'),
  ('54421bf8-9d86-481f-83c6-29ec051a36bb'::uuid, '3F', 26, 'MONICA HENY L. D.', DATE '1968-07-18'),
  ('432cd6dc-7b41-409c-bda5-a263df334fc7'::uuid, '3F', 27, 'NATALIA NANIK', DATE '1968-12-25'),
  ('c303b044-3606-4ba5-883b-7d64754a7e1b'::uuid, '3F', 28, 'NIRBANAWATI', DATE '1968-05-27'),
  ('2446d8f9-2730-45b8-a0a4-8591e395502e'::uuid, '3F', 29, 'NURUL SULISTYANI', DATE '1968-07-15'),
  ('e28972d9-5b65-41a3-ba7d-065b02fbfe40'::uuid, '3F', 30, 'RIDWAN CAHYAWIJAYA', DATE '1969-02-10'),
  ('c6404845-e0ab-4dbe-8d77-4557366968e0'::uuid, '3F', 31, 'RUBIONO HARSADI', DATE '1969-06-13'),
  ('23f7dc97-396a-4c7e-a74f-715caf29880e'::uuid, '3F', 32, 'R.M. POLLY SULISTYA', DATE '1968-09-08'),
  ('339c5379-2b98-45f1-bf26-55090892bd99'::uuid, '3F', 33, 'SESILIA ONG A YOENG', DATE '1968-11-22'),
  ('ccb73e67-267d-4d50-999e-5000fb8a596f'::uuid, '3F', 34, 'SIANY PANGESTU', DATE '1968-12-22'),
  ('77f8dcf0-4fc1-4b74-8ef9-0b59ab9ea8c6'::uuid, '3F', 35, 'T.SRI SAFRINA WIRAWAN', DATE '1969-08-30'),
  ('5a1d1c9a-2937-4fba-b3cb-e1e1bd08ddd9'::uuid, '3F', 36, 'SRIMEI ANDAJANI HUSEN', DATE '1968-05-18'),
  ('70e3a169-cc6b-4034-bcc8-906b988b9f19'::uuid, '3F', 37, 'SUHERMAN AGUS', DATE '1967-09-06'),
  ('91b991ae-bf3e-4164-8552-c8c46532182e'::uuid, '3F', 38, 'SUTJI DIANINGTYAS', DATE '1968-04-19'),
  ('b9036546-6282-4434-8334-ba61cbdb3abe'::uuid, '3F', 39, 'TEDDY SANTOSO', DATE '1969-02-15'),
  ('ad3bcc3c-ff80-4d88-be69-b8d2b0e524fb'::uuid, '3F', 40, 'TJHEN NJOEN JIN', DATE '1968-08-20'),
  ('f203ed44-0011-4bf2-b281-5181b0ae531a'::uuid, '3F', 41, 'TINA MARIANA TANU', DATE '1968-10-11'),
  ('4f573601-8d32-4235-8a4b-eb3adcd72244'::uuid, '3F', 42, 'TONO YOSHUA RAY', DATE '1968-03-13'),
  ('f88ee3d0-e0ea-41e2-9af4-c9a4a029d7dd'::uuid, '3F', 43, 'UUNG MIDJAJA', DATE '1967-09-30'),
  ('370ca326-d074-409c-baa1-7e114c4f1f0c'::uuid, '3F', 44, 'YANNY SUGIRI', DATE '1968-09-15'),
  ('19a8dd09-76cf-462a-854c-40aa22fda9f1'::uuid, '3F', 45, 'YOESMAN SUGIANTO', DATE '1970-03-10'),
  ('4bd81380-dd21-4736-9cbe-5731e0061c31'::uuid, '3F', 46, 'YULIANA MAWENGKANG', DATE '1969-07-07');

-- Guard: every staged row must line up with the live roster row it claims.
DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad
  FROM _bd v
  LEFT JOIN alumni_roster ar ON ar.id = v.id
  WHERE ar.id IS NULL OR ar.kelas <> v.kelas OR ar.absen <> v.absen
     OR ar.nama_lengkap <> v.nama;
  IF bad > 0 THEN
    RAISE EXCEPTION 'Roster drift: % staged row(s) do not match alumni_roster. Aborting.', bad;
  END IF;
  IF (SELECT count(*) FROM _bd) <> 276 THEN
    RAISE EXCEPTION 'Expected 276 staged rows, got %', (SELECT count(*) FROM _bd);
  END IF;
END $$;

-- 1. Roster (all 276, including the alumni who have not registered).
UPDATE alumni_roster ar
SET    birthdate = v.bd
FROM   _bd v
WHERE  ar.id = v.id
  AND  ar.birthdate IS DISTINCT FROM v.bd;

-- 2. Propagate to the linked member accounts (fills empties AND overwrites the
--    6 conflicts above, per the confirmed policy).
UPDATE profiles p
SET    birthdate = ar.birthdate
FROM   alumni_roster ar
WHERE  ar.profile_id = p.id
  AND  ar.birthdate IS NOT NULL
  AND  p.birthdate IS DISTINCT FROM ar.birthdate;

COMMIT;

-- ---------------------------------------------------------------------------
-- Verification (expect: 276 roster rows with a birthdate, 0 without;
--               every linked profile's birthdate equal to its roster row).
-- ---------------------------------------------------------------------------
SELECT count(*) FILTER (WHERE birthdate IS NOT NULL) AS roster_with_bd,
       count(*) FILTER (WHERE birthdate IS NULL)     AS roster_without_bd,
       min(birthdate) AS earliest, max(birthdate) AS latest
FROM   alumni_roster;

SELECT count(*) AS linked_profiles_out_of_sync
FROM   alumni_roster ar
JOIN   profiles p ON p.id = ar.profile_id
WHERE  ar.birthdate IS NOT NULL AND p.birthdate IS DISTINCT FROM ar.birthdate;
