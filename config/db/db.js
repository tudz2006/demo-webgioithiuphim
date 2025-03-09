let json = {
    encode: (data, pretty = true) => {
        try {
            return JSON.stringify(data, null, pretty ? 4 : 0);
        } catch (error) {
            console.error("Lỗi khi encode JSON:", error);
            return null;
        }
    },
    decode: (jsonString) => {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.error("Lỗi khi decode JSON:", error);
            return null;
        }
    }
};

let db = {
    select: async function (filename) {
        const path = `../config/db/db/${filename}.json`;
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`Lỗi tải ${filename}: ${response.statusText}`);
            let text = await response.text();
            return json.decode(text);
        } catch (error) {
            console.error(error);
            return null;
        }
    },

    query: async function (textQuery) {
        const regex = /SELECT\s+(.*?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i;
        const match = textQuery.match(regex);

        if (!match) {
            console.error("Lệnh SQL không hợp lệ.");
            return null;
        }

        const columns = match[1].trim() === "*" ? null : match[1].split(",").map(c => c.trim());
        const tableName = match[2].trim();
        const whereClause = match[3] ? match[3].trim() : null;
        const orderBy = match[4] ? match[4].trim() : null;
        const limit = match[5] ? parseInt(match[5].trim(), 10) : null;

        let data = await db.select(tableName);
        if (!data) {
            console.error(`Không tìm thấy bảng '${tableName}'.`);
            return null;
        }

        if (whereClause) {
            try {
                const conditionParser = new Function("row", `
                    return ${whereClause
                        .replace(/=/g, "==")
                        .replace(/<>/g, "!=")
                        .replace(/\bAND\b/g, "&&")
                        .replace(/\bOR\b/g, "||")
                        .replace(/\bLIKE\b/g, "match")
                        .replace(/([a-zA-Z0-9_]+)\s+match\s+'(.*?)'/g, `String(row.$1).includes('$2')`)
                        .replace(/(\w+)\s+IN\s+\(([^)]+)\)/g, `['$2'].includes(row.$1)`)
                    };
                `);
                data = data.filter(row => conditionParser(row));
            } catch (error) {
                console.error("Lỗi khi lọc dữ liệu:", error);
            }
        }

        if (orderBy) {
            const [orderColumn, orderType] = orderBy.split(/\s+/);
            data.sort((a, b) => {
                if (a[orderColumn] < b[orderColumn]) return orderType.toUpperCase() === "DESC" ? 1 : -1;
                if (a[orderColumn] > b[orderColumn]) return orderType.toUpperCase() === "DESC" ? -1 : 1;
                return 0;
            });
        }

        if (limit) {
            data = data.slice(0, limit);
        }

        if (columns) {
            data = data.map(row => {
                let filteredRow = {};
                columns.forEach(col => {
                    if (row.hasOwnProperty(col)) filteredRow[col] = row[col];
                });
                return filteredRow;
            });
        }

        return {
            data, 
            num_rows: () => data.length,
            fetch_assoc: () => (data.length > 0 ? data[0] : null),
            fetch_all: () => data,
            fetch_column: (column) => data.map(row => row[column]).filter(value => value !== undefined)
        };
    }
};
window.db = db;
