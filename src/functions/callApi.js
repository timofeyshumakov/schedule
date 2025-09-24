export async function callApi(method, filter, select, entityTypeId, batchNumber, parsed) {
    let total = 0;
    const maxTotal = 50;
    let data = [];
    const params = {
        filter: filter ? filter : null,
        select: select ? select : null,
        entityTypeId: entityTypeId ? entityTypeId : null,
        id: method === "crm.dealcategory.stage.list" ? entityTypeId : null,
        start: 0,
    };

    const exceptions = ["crm.status.list"];

    await new Promise((resolve) => {
        BX24.callMethod(method, params, (res) => {
            if (res.data()) {
                total = res.total();
                data = res.data();
                parsed += total;
                resolve(data);
            }
        });
    });

    if (total > maxTotal && !exceptions.includes(method)) {
        let cmd = {};
        const iterations = Math.min(Math.ceil((total - 0 * 2500) / maxTotal), 50);
        console.log(iterations);
        let resultData = [];
        for (let i = 0; i < iterations; i++) {
            const key = `cmd${i}`;
            const value = {
                method: method,
                params: {
                    filter: filter || null,
                    select: select || null,
                    entityTypeId: entityTypeId || null,
                    id: method === "crm.dealcategory.stage.list" ? entityTypeId : null,
                    start: (0 * 2500) + i * maxTotal,
                }
            };
            cmd[key] = value;
            if ((i + 1) % maxTotal === 0 || i + 1 === iterations) {
                const batchLength = (i + 1) % maxTotal === 0 ? maxTotal : iterations % maxTotal;
                await new Promise((resolve) => {
                    BX24.callBatch(cmd, (res) => {
                        for (let r = i - batchLength + 1; r < i + 1; r++) {
                            const key = `cmd${r}`;
                            const data = res[key].data();
                            const data2 = data.items ? data.items : data;
                            resultData.push(data2);
                        }
                        resultData = resultData.flat();
                        data = resultData;
                        cmd = {};
                        resolve();
                    });
                });
                break;
            }
        }
    }
    return data.items ? data.items : data;
}