// @ts-nocheck
import React, { useRef } from "react";
import { createRoot } from 'react-dom/client';
import { useTable, usePagination } from "react-table";
import "./assets/scss/styles.scss";
import { Button, ChakraProvider, Container, Input, InputGroup, InputLeftElement, TableContainer, VStack, Table as ChakraTable, Thead, Tr, Th, Tbody, Td, Box, Icon, IconButton, ButtonGroup, HStack, NumberInput, NumberInputField, Select, FormLabel, Switch, useToast, Heading, AlertIcon, Alert } from "@chakra-ui/react";
import { AddIcon, ArrowForwardIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon, PhoneIcon } from "@chakra-ui/icons";
import { FileDownload, SaveAltOutlined } from "@mui/icons-material";
import { ethers } from "ethers";

const range = (len) => {
  // Creates [0, 1, 2, ... <len>]
  return [...Array(len).keys()];
};

const newPerson = () => {
  const statusChance = Math.random();
  return {
    walletAddress: ethers.getAddress("0xab5801a7d398351b8be11c439e05c5b3259aec9b"),
    nickName: "vbuterin",
  };
};

function makeData(...lens) {
  const makeDataLevel = (depth = 0) => {
    const len = lens[depth];
    return range(len).map((d) => {
      return {
        ...newPerson(),
        subRows: lens[depth + 1] ? makeDataLevel(depth + 1) : undefined,
      };
    });
  };
  return makeDataLevel();
}

const storageKey = "data_accounting_name_resolution";
const nameResolutionEnabledKey =
  "data_accounting_name_resolution_enabled_state";

async function prepareData() {
  const d = await chrome.storage.sync.get(storageKey);
  if (!d[storageKey]) {
    return makeData(1);
  }
  const parsed = JSON.parse(d[storageKey]);
  // Convert to array
  const arrayData = Object.keys(parsed).map((k) => {
    return { walletAddress: k, ...parsed[k] };
  });
  return arrayData;
}

async function prepareNameResolutionEnabled() {
  const d = await chrome.storage.sync.get(nameResolutionEnabledKey);
  if (!d[nameResolutionEnabledKey]) {
    return true;
  }
  return JSON.parse(d[nameResolutionEnabledKey]);
}

// Create an editable cell renderer
const EditableCell = ({
  value: initialValue,
  row: { index },
  column: { id },
  updateMyData, // This is a custom function that we supplied to our table instance
}) => {
  // We need to keep and update the state of the cell normally
  const [value, setValue] = React.useState(initialValue ?? "");

  //if (id === "walletAddress") {
  //  // walletAddress must be read-only.
  //  return <div>{value}</div>;
  //}

  const onChange = (e) => {
    setValue(e.target.value);
  };

  // We'll only update the external data when the input is blurred
  const onBlur = () => {
    updateMyData(index, id, value);
  };

  // If the initialValue is changed external, sync it up with our state
  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return <input value={value} onChange={onChange} onBlur={onBlur} />;
};

// Set our editable cell renderer as the default Cell renderer
const defaultColumn = {
  Cell: EditableCell,
};

// Be sure to pass our updateMyData and the skipPageReset option
function Table({ columns, data, updateMyData, skipPageReset }) {
  // For this example, we're using pagination to illustrate how to stop
  // the current page from resetting when our data changes
  // Otherwise, nothing is different here.
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize },
  } = useTable(
    {
      columns,
      data,
      defaultColumn,
      // use the skipPageReset option to disable page resetting temporarily
      autoResetPage: !skipPageReset,
      // updateMyData isn't part of the API, but
      // anything we put into these options will
      // automatically be available on the instance.
      // That way we can call this function from our
      // cell renderer!
      updateMyData,
    },
    usePagination
  );
  // Render the UI for your table
  return (
    <Box w={'100%'}>
      <Box p={'sm'} overflow={'hidden'} mb={'20px'} className="name-resolution-table" borderRadius={'lg'} borderColor={'rgba(0, 0, 0, 0.2)'} borderWidth={'1px'}>
        <TableContainer>
          <ChakraTable variant='simple' size={'sm'}>
            <Thead>
              {headerGroups.map((headerGroup) => (
                <Tr {...headerGroup.getHeaderGroupProps()}>
                  {headerGroup.headers.map((column) => (
                    <Th {...column.getHeaderProps()}>{column.render("Header")}</Th>
                  ))}
                </Tr>
              ))}
            </Thead>
            <Tbody {...getTableBodyProps()}>
              {page.map((row, i) => {
                prepareRow(row);
                return (
                  <Tr {...row.getRowProps()}>
                    {row.cells.map((cell) => {
                      return (
                        <Td {...cell.getCellProps()}>{cell.render("Cell")}</Td>
                      );
                    })}
                  </Tr>
                );
              })}
            </Tbody>
          </ChakraTable>
        </TableContainer>
      </Box>
      <HStack justify={'space-between'} align={'center'}>
        <HStack>
          <ButtonGroup spacing={2} me={'20px'}>
            <IconButton onClick={() => gotoPage(0)} isDisabled={!canPreviousPage} title="Page 1" icon={<ArrowLeftIcon boxSize={4} stroke={'1.5em'} color={'gray.500'} />} />
            <IconButton onClick={() => previousPage()} isDisabled={!canPreviousPage} title="Previous Page" icon={<ChevronLeftIcon boxSize={8} stroke={'1.5em'} color={'gray.500'} />} />
            <IconButton onClick={() => nextPage()} isDisabled={!canNextPage} title="Last Page" icon={<ChevronRightIcon boxSize={8} stroke={'1.5em'} color={'gray.500'} />} />
            <IconButton onClick={() => gotoPage(pageCount - 1)} isDisabled={!canNextPage} title="Last Page" icon={<ArrowRightIcon boxSize={4} stroke={'1.5em'} color={'gray.500'} />} />
          </ButtonGroup>
          <span>
            Page{" "}
            <strong>
              {pageIndex + 1} of {pageOptions.length}
            </strong>
          </span>
          <span>
            | Go to page:{" "}
          </span>
          <NumberInput size={'md'} >
            <NumberInputField
              borderRadius={'md'}
              type="number"
              defaultValue={pageIndex + 1}
              onChange={(e) => {
                const page = e.target.value ? Number(e.target.value) - 1 : 0;
                gotoPage(page);
              }}
              style={{ width: "100px" }}
              placeholder="2"
            />
          </NumberInput>
        </HStack>
        <Select
          width={'150px'}
          size={'md'}
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
          }}>
          {[10, 20, 50].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </Select>
      </HStack>
    </Box>
  );
}

const FileUploadButton = ({ importFile }: { importFile: any }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importFile(file)
    }
  };

  return (
    <>
      <Input
        ref={inputRef}
        type="file"
        display="none"
        onChange={handleFileChange}
      />
      <Button onClick={handleClick} colorScheme="teal" leftIcon={<ArrowUpIcon boxSize={4} />} variant={'ghost'} size={'sm'}>
        Import
      </Button>
    </>
  );
};

const App = () => {
  const columns = React.useMemo(
    () => [
      {
        Header: "Info",
        columns: [
          {
            Header: "Account",
            accessor: "walletAddress",
          },
          {
            Header: "Alias",
            accessor: "nickName",
          },
        ],
      },
    ],
    []
  );

  const [data, setData] = React.useState([]);
  const [skipPageReset, setSkipPageReset] = React.useState(false);
  const [nameResolutionEnabled, setNameResolutionEnabled] = React.useState(false);
  const toast = useToast()
  // We need to keep the table from resetting the pageIndex when we
  // Update data. So we can keep track of that flag with a ref.

  // When our cell renderer calls updateMyData, we'll use
  // the rowIndex, columnId and new value to update the
  // original data
  const updateMyData = (rowIndex, columnId, value) => {
    // We also turn on the flag to not reset the page
    setSkipPageReset(true);
    setData((old) =>
      old.map((row, index) => {
        if (index === rowIndex) {
          return {
            ...old[rowIndex],
            [columnId]: value,
          };
        }
        return row;
      })
    );
  };

  const onAddRowClick = () => {
    setData(data.concat({ walletAddress: "", nickName: "" }));
  };


  const onExport = () => {
    // Create a Blob with the JSON content and the correct MIME type
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    // Create a link element
    const link = document.createElement('a');
    // Set the download attribute with the desired file name
    link.download = 'name_resolution_export.json';
    // Create a URL for the Blob and set it as the href attribute of the link
    link.href = URL.createObjectURL(blob);
    // Programmatically click the link to trigger the download
    link.click();
    // Clean up by revoking the object URL
    URL.revokeObjectURL(link.href);
  }

  // After data changes, we turn the flag back off
  // so that if data actually changes when we're not
  // editing it, the page is reset
  React.useEffect(() => {
    setSkipPageReset(false);
  }, [data]);

  React.useEffect(() => {
    prepareData().then(setData);
    // Restore nameResolutionEnabled state from storage.
    prepareNameResolutionEnabled().then(setNameResolutionEnabled);
  }, []);

  const saveData = (arg: React.SyntheticEvent | object[]) => {
    // Convert the array data to a hash map structure.
    // This automatically deduplicates the array based on the walletAddress.
    let d;
    if ("currentTarget" in arg) {
      // If saveData is called from button click
      d = data;
    } else {
      // If save data is called from file upload, then arg is
      // the name list imported from the file.
      d = arg
    }
    const hashmapData = {};
    for (const e of d) {
      const walletAddress = e.walletAddress;
      if (!walletAddress) {
        // If this happens, we just ignore the row.
        continue;
      }
      const clone = Object.assign({}, e)
      // We delete the wallet address from the entry to save space.
      delete clone.walletAddress;
      const cleanedWalletAddress = ethers.getAddress(walletAddress)
      hashmapData[cleanedWalletAddress] = clone;
    }
    chrome.storage.sync.set({ [storageKey]: JSON.stringify(hashmapData) });
    toast({
      title: 'Data saved.',
      description: "Data for name resolution saved successfully.",
      status: 'success',
      duration: 4000,
      isClosable: true,
    })
  };

  const importFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!(e && e.target && e.target.result)) {
        return;
      }
      const parsed = JSON.parse(e.target.result as string);
      const newData = data
      parsed.forEach(item => {
        const exists = data.some(baseItem => baseItem.walletAddress.toLowerCase() === item.walletAddress.toLowerCase());
        if (!exists) {
          newData.push({
            nickName: item.name,
            walletAddress: ethers.getAddress(item.walletAddress)
          });
        }
      });
      setData(newData);
      saveData(newData);
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'names.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveNameResolutionEnabled = (enabled) => {
    setNameResolutionEnabled(enabled);
    chrome.storage.sync.set({
      [nameResolutionEnabledKey]: JSON.stringify(enabled),
    });
  };

  return (
    <>
      <Container maxW={'container.xl'} py={'40px'}>
        <VStack align={'start'} justify={'start'}>
          <Heading as={'h1'} fontWeight={500} size={'2xl'}>Name Resolution</Heading>
          <HStack justify={'space-between'} align={'center'} w={'100%'}>
            <div>
              <HStack align={'center'}>
                <FormLabel htmlFor='enable-name-resolution'>Enable name resolution</FormLabel>
                <Switch id='enable-name-resolution'
                  colorScheme="green"
                  onChange={(event) =>
                    saveNameResolutionEnabled(event.target.checked)
                  }
                  isChecked={nameResolutionEnabled}
                />
              </HStack>
            </div>
            <HStack spacing={1}>
              <Button colorScheme='blue' onClick={onAddRowClick} leftIcon={<AddIcon boxSize={4} />} variant={'ghost'} size={'sm'}>Add Entry</Button>
              <Button colorScheme='green' onClick={saveData} leftIcon={<ArrowForwardIcon boxSize={4} />} variant={'ghost'} size={'sm'}>Save</Button>
              <FileUploadButton importFile={importFile} />
              <Button colorScheme='cyan' onClick={handleExport} leftIcon={<DownloadIcon boxSize={4} />} variant={'ghost'} size={'sm'}>Export</Button>
            </HStack>
          </HStack>
          <Table
            columns={columns}
            data={data}
            updateMyData={updateMyData}
            skipPageReset={skipPageReset}
          />
        </VStack>
      </Container>
    </>
  );
};

const root = createRoot(document.getElementById("root")!)
root.render(
  <ChakraProvider>
    <App />
  </ChakraProvider>
);
