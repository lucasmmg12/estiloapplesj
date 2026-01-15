-- Delete all transactions before January 2026
DELETE FROM transactions 
WHERE date < '2026-01-01T00:00:00Z';
como podemos optimizar la 